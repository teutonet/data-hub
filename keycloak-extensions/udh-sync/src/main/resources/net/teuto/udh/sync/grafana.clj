(ns net.teuto.udh.sync.grafana
  "Main synchronization code for Grafana orgs and users."
  (:require [clojure.string :as str]
            [net.teuto.udh.sync.udh :as common :refer [json-payload]]
            [taoensso.timbre :refer [info]]))

;; environment

(def grafana-host (or (System/getenv "GRAFANA_HOST") "localhost:3000"))
(def grafana-admin [(or (System/getenv "GRAFANA_USER") "admin")
                    (or (System/getenv "GRAFANA_PASSWORD") "admin")])

(defn http [path opts]
  (binding [common/*host* (or common/*host*
                              grafana-host)
            common/*basic-auth* (or common/*basic-auth*
                                    grafana-admin)]
    (common/http path opts)))


(def prometheus-host (or (System/getenv "PROMETHEUS_HOST") "prometheus"))

(def public-org-name
  "Name of the public Grafana organization that everyone should be allowed to view."
  "public")

(def public-org
  {:id 1
   :name public-org-name})

;; utils

(defn parse-mapping [mapping-string]
  (let [[orgname projects] (str/split mapping-string #"=" 2)]
    [orgname (->> (str/split projects #",")
                  (remove str/blank?)
                  set)]))

(defn parse-mappings [mapping-strings]
  (->> mapping-strings
       (map parse-mapping)
       (into {public-org-name #{}})))

(defn get-paginated
  ([path start-at]
   (get-paginated path start-at {}))
  ([path start-at params]
   (->> (range)
        (drop start-at)
        (map #(http path {:query-params (merge params {:page %})}))
        (take-while not-empty)
        (apply concat))))

(defn set-public-name []
  (http "/api/orgs/1"
        (merge (json-payload {:name public-org-name})
               {:method :put})))

(defn set-current-org
  "Set the current organization to allow deleting all other organizations
   and scope requests in Grafana's quite stateful API."
  ([org]
   (http (str "/api/user/using/" (:id org))
         {:method :post}))
  ([org user]
   (http (str "/api/users/" (:id user) "/using/" (:id org))
         {:method :post})))

(defn rewrite-org-id
  "Rename the :orgId key to :id to make Grafana's API consistent"
  [org]
  (-> org
      (assoc :id (:orgId org))
      (dissoc :orgId)))

;; organizations

(defn existing-orgs []
  (get-paginated "/api/orgs" 0))

(defn lookup-orgs [org-names]
  (when (seq org-names)
    (->> (existing-orgs)
         (filter #(org-names (:name %))))))

(defn create-org [name]
  (info "Creating organization" name)
  (->> (json-payload {:name name})
       (merge {:method :post})
       (http "/api/orgs")
       rewrite-org-id))

(defn delete-org [{:keys [id name]}]
  (info "Deleting organization" name)
  (let [org-ids (if id
                  [id]
                  (->> (existing-orgs)
                       (filter #(-> % :name (= name)))
                       (map :id)))]
    (run! #(http (str "/api/orgs/" %)
                 {:method :delete})
          org-ids)))

(defn sync-org-presence [desired-names]
  (set-public-name)
  (set-current-org public-org)
  (common/sync {:existing-fn existing-orgs
                :identifier #(if (string? %)
                               %
                               (:name %))
                :delete-fn delete-org
                :create-fn create-org
                :resources desired-names}))

;; users

(defn all-users
  "Gets all non-admin users."
  []
  (->> (get-paginated "/api/users" 1)
       (remove :isAdmin)))

(defn lookup-user [login]
  (try (http "/api/users/lookup"
             {:query-params {:loginOrEmail login}})
       (catch clojure.lang.ExceptionInfo _)))

(defn create-user
  ([login] (create-user login {}))
  ([login extra]
   (info "Creating user" login)
   (-> (http (str "/api/admin/users")
             (-> {:login login
                  :password (str (random-uuid))}
                 (merge extra)
                 json-payload
                 (merge {:method :post})))
       (select-keys [:id])
       (assoc :login login))))

(defn delete-user
  "Delete a user. :id or :login must be given."
  [user]
  (when-some [{:keys [id login]}
              (if (:id user)
                user
                (lookup-user (:login user)))]
    (info "Deleting user" id login)
    (http (str "/api/admin/users/" id)
          {:method :delete})))

(defn ensure-user-exists
  "Ensure user exists and return at least their :id and :login."
  [login]
  (or (lookup-user login)
      (create-user login)))

(defn current-user-orgs [user]
  (->> (http (str "/api/users/" (:id user) "/orgs") {})
       (map rewrite-org-id)
       set))

(defn add-user-to-org
  ([user org] (add-user-to-org user org {}))
  ([user org extra]
   (info "Adding user" (:login user)
         "to organization" (:name org))
   (http (str "/api/orgs/" (:id org) "/users")
         (-> {:loginOrEmail (:login user)
              :role "Editor"}
             (merge extra)
             json-payload
             (merge {:method :post})))))

(defn set-role [user org role]
  (info "Updating role of user" (:login user)
        "in organization" (:name org)
        "to" role)
  (http (str "/api/orgs/" (:id org) "/users/" (:id user))
        (-> {:role role}
            json-payload
            (merge {:method :patch}))))

(defn remove-user-from-org [user org]
  (info "Removing user" (:login user)
        "from organization" (:name org))
  (http (str "/api/orgs/" (:id org) "/users/" (:id user))
        {:method :delete}))

(defn sync-user
  "Synchronizes org membership and email address (by recreating).
   Skips orgs that do not exist (err on the side of less permissions during org change races)
   and always adds the public organization."
  [login-or-user email desired-org-names skip-missing]
  (when-some [user (if (map? login-or-user)
                     login-or-user
                     ((if skip-missing
                        lookup-user
                        ensure-user-exists)
                      login-or-user))]
    (let [user (if (->> user
                        :email
                        (contains? #{nil
                                     email
                                     (:login user)}))
                 user
                 (do (delete-user user)
                     (create-user (:login user))))
          desired-org-names (-> desired-org-names
                                set
                                (conj public-org-name))
          current-orgs (current-user-orgs user)]
      (->> current-orgs
           (remove #(desired-org-names (:name %)))
           (run! #(remove-user-from-org user %)))
      (->> desired-org-names
           (remove (->> current-orgs (map :name) set))
           set
           lookup-orgs
           (run! #(add-user-to-org user %))))))

;; datasources

(defn existing-datasources []
  (http "/api/datasources" {}))

(defn create-datasource [{:keys [name] :as datasource}]
  (info "Creating datasource" name)
  (http (str "/api/datasources")
        (merge (json-payload datasource)
               {:method :post})))

(defn delete-datasource [{:keys [uid name]}]
  (info "Deleting datasource" name uid)
  (http (str "/api/datasources/uid/" uid)
        {:method :delete}))

(defn make-datasource [projects]
  (let [header-value (->> projects
                          sort
                          distinct
                          (str/join "|"))]
    {:name "Prometheus"
     :type "prometheus"
     :uid "prometheus"
     :access "proxy"
     :url (str "http://" prometheus-host "/prometheus")
     :jsonData {:httpHeaderName1 "X-Scope-OrgID"
                :httpHeaderValue1 header-value ; also store readable for future syncs
                }
     :secureJsonData {:httpHeaderValue1 header-value}}))

(def tmpadmin-prefix "tmpadmin-")

(defn with-tmpadmin
  "Runs a function inserting a temporary tmpadin user as the first argument.
   Creates a temporary admin user to make the stateful Grafana API safe for
   possibly multiple concurrent script executions and deletes it afterwards."
  [f & args]
  (let [login (str tmpadmin-prefix (random-uuid))
        password (str (random-uuid))
        tmpadmin (-> (create-user login {:password password})
                     (assoc :password password))]
    (try
      (apply f tmpadmin args)
      (finally
        (delete-user tmpadmin)))))

(defn iterate-orgs-with-tmpadmin
  "Runs a function as tmpadmin for each mapping if the org identified by the key was found,
   using the value as the first argument."
  [f mappings & extra-args]
  (with-tmpadmin
    #(let [orgs (->> (existing-orgs)
                     (map (juxt :name identity))
                     (into {}))]
       (->> mappings
            (map (fn [i]
                   (let [[org-name f-args] (if (seqable? i)
                                             [(first i) (concat (rest i) extra-args)]
                                             [i extra-args])]
                     (when-let [org (orgs org-name)]
                       (if (-> org :id (= (:id public-org)))
                         (set-role % public-org "Admin")
                         (add-user-to-org % org {:role "Admin"}))
                       (binding [common/*basic-auth* ((juxt :login :password) %)]
                         (set-current-org org)
                         {org (apply f f-args)})))))
            (into {})))))

(defn reconcile-datasources [datasources]
  (common/sync {:existing-fn existing-datasources
                :identifier :uid
                :delete-fn delete-datasource
                :create-fn create-datasource
                :update-fn (fn [old-ds ds]
                             (when (-> old-ds
                                       (select-keys (keys ds))
                                       (not= (dissoc ds :secureJsonData)))
                               (delete-datasource old-ds)
                               (create-datasource ds)))
                :resources datasources}))

(defn ensure-single-datasource [projects]
  (reconcile-datasources #{(make-datasource projects)}))

(defn sync-datasources
  "Synchronizes the datasource for each organization."
  [mappings]
  (iterate-orgs-with-tmpadmin ensure-single-datasource
                              mappings))

;; dashboards

(defn existing-dashboards
  ([] (existing-dashboards {}))
  ([filters]
   (->> (get-paginated "/api/search" 1 filters)
        (map #(http (str "/api/dashboards/uid/" (:uid %)) {}))
        doall)))

(defn public-dashboards []
  (existing-dashboards {:tag "public"}))

(defn upsert-dashboard [dashboard]
  (info "Creating/Updating dashboard" (-> dashboard :dashboard :title))
  (http (str "/api/dashboards/db")
        (-> dashboard
            (update :dashboard dissoc :id)
            (assoc :overwrite true)
            json-payload
            (merge {:method :post}))))

(defn delete-dashboard [{{:keys [uid title]} :dashboard}]
  (info "Deleting dashboard" title uid)
  (http (str "/api/dashboards/uid/" uid)
        {:method :delete}))

(defn reconcile-dashboards [dashboards]
  (common/sync {:existing-fn existing-dashboards
                :identifier [:dashboard :uid]
                :delete-fn delete-dashboard
                :create-fn upsert-dashboard
                :update-fn (fn [_old-dashboard dashboard]
                             (upsert-dashboard dashboard))
                :resources dashboards}))

;; CLI

(defn -main
  ([] (-main "help"))
  ([action & args]
   (case action
     "sync-orgs" (let [mappings (parse-mappings args)]
                   (info "Synchronizing organizations" mappings)
                   (sync-org-presence (keys mappings))
                   (sync-datasources mappings))
     "sync-user" (sync-user (->> args first)
                            (->> args second)
                            (->> args (drop 2))
                            false)
     "list-users" (->> (all-users)
                       (map (juxt :login :email))
                       (run! #(apply println %)))
     (run! println
           ["sync-orgs   org1=project1,project2 org2=project1 [...]"
            "sync-user   username email [organization...]"
            "list-users"]))))

; execute -main if run as a script or inline
(when (#{(System/getProperty "babashka.file") "<expr>"} *file*)
  (apply -main *command-line-args*))
