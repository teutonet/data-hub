(ns net.teuto.udh.sync.keycloak
  "Keycloak-specific functionality."
  (:require [clojure.core.memoize :as memo]
            [clojure.string :as str]
            [net.teuto.udh.resource.core :as resources :refer [get-for-user]]
            [net.teuto.udh.sync.bucket :as bucket]
            [net.teuto.udh.sync.chirpstack :as chirpstack]
            [net.teuto.udh.sync.grafana :as grafana]
            [net.teuto.udh.resource.event.grafana :as ge]
            [net.teuto.udh.resource.event.bucket :as be]
            [net.teuto.udh.sync.udh :refer [to-seq]]
            [taoensso.timbre :refer [info]])
  (:import [java.time Duration Instant]
           [java.util.concurrent TimeUnit]
           [org.keycloak.services.scheduled ClusterAwareScheduledTaskRunner]
           [org.keycloak.timer ScheduledTask TimerProvider]))

;; utils

(defn realm [session]
  (-> session .getContext .getRealm))

(defn orgs-for-user [session user]
  (->> (get-for-user session user :group :dashboard-edit)
       (map (fn [{:keys [tenant group]}]
              (ge/grafana-org-name tenant group)))))

(defn user-by-id [id session]
  (-> session
      .users
      (.getUserById (realm session)
                    id)))

(defn user-by-email [email session]
  (-> session
      .users
      (.getUserByEmail (realm session)
                       email)))

;; grafana sync

(def ^:private sync-grafana-user-cached
  (memo/ttl grafana/sync-user
            {}
            :ttl/threshold 10000))

(defn sync-grafana-user
  ([user session & {:keys [skip-missing grafana-user]}]
   (sync-grafana-user-cached (or grafana-user (.getId user))
                             (.getEmail user)
                             (orgs-for-user session user)
                             skip-missing)))

(defn sync-all-grafana
  "Syncs all users that exist in Grafana.
   Also deletes Grafana users that were not deleted
   during user deletion because of temporary error conditions
   or created manually."
  [session]
  (info "Synchronizing all Grafana users")
  (->> (grafana/all-users)
       (map #(if-let [kc-user (-> %
                                  :login
                                  (user-by-id session))]
               (sync-grafana-user kc-user
                                  session
                                  {:grafana-user %})
               (when (or (not (-> % :login (str/starts-with? grafana/tmpadmin-prefix)))
                         (-> %
                             :createdAt
                             Instant/parse
                             (Duration/between (Instant/now))
                             .toMinutes (> 60)))
                 (grafana/delete-user %))))
       count
       (info "Grafana users synchronized:"))
  (memo/memo-clear! sync-grafana-user-cached))

;; Chirpstack sync

(def ^:private sync-chirpstack-user-cached
  (memo/ttl chirpstack/sync-user
            {}
            :ttl/threshold 10000))

(defn sync-chirpstack-user
  ([user]
   ;TODO
   ))

(defn sync-all-chirpstack
  "Syncs all users that exist in Chirpstack.
   Also deletes Chirpstack users that were not deleted
   during user deletion because of temporary error conditions
   or created manually."
  [session]
  (info "Synchronizing all Chirpstack users")
  (->> (chirpstack/all-users)
       (map #(if-let [kc-user (-> %
                                  :email
                                  (user-by-email session))]
               (sync-chirpstack-user kc-user)
               (chirpstack/delete-user %)))
       count
       (info "Chirpstack users synchronized:"))
  (memo/memo-clear! sync-chirpstack-user-cached))

;; clients

(defn set-claim-grafana [session token user]
  (sync-grafana-user user session)
  (.setOtherClaims token
                   "preferred_username"
                   (.getId user)))

(defn set-claim-prometheus-read [session token user]
  (->> (get-for-user session user :project :prometheus-read)
       (map (fn [{:keys [tenant project]}]
              (ge/get-flat-project-name tenant project)))
       sort
       distinct
       (str/join "|")
       (.setOtherClaims token "groups")))

(defn set-claim-buckets [session token user]
  (->> (get-for-user session user :project :bucket-write)
       (map (fn [{:keys [tenant project]}]
              (be/bucket-name tenant project)))
       bucket/session-tags
       (.setOtherClaims token "https://aws.amazon.com/tags")))

(defn set-claim-usercode [session scopes token user]
  (when (scopes "prometheus_read") (set-claim-prometheus-read session token user))
  (when (scopes "buckets") (set-claim-buckets session token user)))

(defn set-claim-mdb [session token user]
  (->> (get-for-user session user :project :sensor-metadata-write)
       (map (fn [{:keys [tenant project]}]
              (ge/get-flat-project-name tenant project)))
       (.setOtherClaims token "projects")))

;; entry points for extension

#_{:clj-kondo/ignore [:clojure-lsp/unused-public-var]}
(defn set-claim
  "Handles claim setting actions during Grafana login."
  [token _mappingModel userSession keycloak-session clientSessionCtx]
  (let [client (.. clientSessionCtx getClientSession getClient getClientId)
        client-scopes (->> clientSessionCtx
                           .getClientScopesStream
                           to-seq
                           (map #(.getName %))
                           (remove nil?)
                           set)
        user (.getUser userSession)]
    (case client
      ; not ideal but worth it for REPL development for now, TODO clean up around 1.0
      "grafana" (set-claim-grafana keycloak-session token user)
      "usercode" (set-claim-usercode keycloak-session client-scopes token user)
      "mdb" (set-claim-mdb keycloak-session token user)
      "mdb-frontend" (set-claim-mdb keycloak-session token user)
      "chirpstack" (sync-chirpstack-user user))))

#_{:clj-kondo/ignore [:clojure-lsp/unused-public-var]}
(defn on-event
  "Handles Keycloak events."
  ([^org.keycloak.models.KeycloakSession _session
    ^org.keycloak.events.Event _event])
  ([^org.keycloak.models.KeycloakSession session
    ^org.keycloak.events.admin.AdminEvent event
    _includeRepresentation]
   (let [path (-> event
                  .getResourcePath
                  (str/split #"/")
                  delay)
         rtype (.getResourceTypeAsString event)]
     (when (and (#{"USER"
                   "GROUP_MEMBERSHIP"}
                 rtype)
                (-> @path first (= "users")))
       (let [id (second @path)]
         (if-let [user (user-by-id id session)]
           (doto user
             (sync-grafana-user session)
             sync-chirpstack-user)
           (grafana/delete-user {:login id})))))))

(def sync-scheduled (atom false))

#_{:clj-kondo/ignore [:clojure-lsp/unused-public-var]}
(defn init
  "Sets up the periodic reconciliation."
  [^org.keycloak.models.KeycloakSession session]
  (let [trigger-interval (.toMillis TimeUnit/DAYS 1)
        initializing-realm (realm session)]
    (when (and (not (first (reset-vals! sync-scheduled true)))
               (some-> initializing-realm .getName (= "udh")))
      (-> session
          (.getProvider TimerProvider)
          (.schedule (new ClusterAwareScheduledTaskRunner
                          (.getKeycloakSessionFactory session)
                          (reify ScheduledTask
                            (run [_ session]
                              (-> session .getContext (.setRealm initializing-realm))
                              (sync-all-grafana session)
                              (when (System/getenv "CHIRPSTACK_HOST")
                                (sync-all-chirpstack session))))
                          trigger-interval)
                     trigger-interval
                     "udh-sync-daily")))))


#_{:clj-kondo/ignore [:clojure-lsp/unused-public-var]}
(defn handle-api-request
  "Handle resource management API request"
  [^org.keycloak.models.KeycloakSession session
   ^jakarta.ws.rs.core.UriInfo uri-info
   method
   body]
  (resources/handle-http-request session
                                 (->> uri-info
                                      .getPathSegments
                                      (drop 3)
                                      (map #(.getPath %)))
                                 (-> method str/lower-case keyword)
                                 body))

#_{:clj-kondo/ignore [:clojure-lsp/unused-public-var]}
(defn evaluate-policy
  "Evaluate custom policy"
  [evaluation]
  (resources/evaluate-policy evaluation))
