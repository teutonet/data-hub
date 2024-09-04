(ns net.teuto.udh.resource.event.grafana
  (:require [net.teuto.udh.resource.util :refer [*authz-context* get-names
                                                 has-permission
                                                 lookup-resources
                                                 override-groups-attribute]]
            [net.teuto.udh.sync.grafana :as grafana]
            [net.teuto.udh.sync.udh :refer [random-name]])
  (:import [org.keycloak.authorization.attribute Attributes]
           [org.keycloak.authorization.common DefaultEvaluationContext]
           [org.keycloak.authorization.identity Identity]))

(defn grafana-org-name [tenant group]
  (str tenant ":" group))

(defn get-flat-project-name [tenant project]
  (str tenant "." project))

(defn ds-org-ids [tenant group]
  (let [{:keys [session] :as acontext} *authz-context*

        ; evaluate visibility of project resources using dummy identity
        ; with the group that the Grafana organization is for
        identity (let [id (random-name)
                       attrs (Attributes/from
                              {override-groups-attribute #{group}})]
                   (reify Identity
                     (getId [_this] id)
                     (getAttributes [_this] attrs)))]
    (binding [*authz-context* (assoc acontext
                                     :evaluation-context
                                     (new DefaultEvaluationContext identity session))]
      (->> (lookup-resources {:tenant tenant}
                             :project)
           (filter #(has-permission % :prometheus-read))
           (mapv #(->> % get-names :project (get-flat-project-name tenant)))

         ; IMPORTANT: non-lazy evaluation because once we exit the (binding [])
         ; the rest would be evaluated using the outer context!
           set))))

(defn sync-orgs [tenant groups]
  (let [mappings (->> groups
                      (mapv (fn [g] [(grafana-org-name tenant g)
                                     (ds-org-ids tenant g)]))
                      (into {}))]
    #(grafana/sync-datasources mappings)))

(defn create-org [tenant group]
  #(do
     (grafana/create-org (grafana-org-name tenant group))
     ((sync-orgs tenant #{group}))))

(defn all-groups [tenant]
  (->> (lookup-resources {:tenant tenant}
                         :group)
       (map get-names)
       (map :group)
       set))

(defn event [{:keys [event-type
                     resource-type
                     resource-name]
              {:keys [groups scopes]} :permission
              {:keys [tenant]} :names}]
  (cond
    (and (= :create event-type)
         (= :group resource-type))
    (create-org tenant resource-name)

    (and (#{:create
            :delete} event-type)
         (= :project resource-type))
    (sync-orgs tenant
               (all-groups tenant))


    (and (#{:create-permission
            :delete-permission} event-type)
         (#{:dashboard-edit
            :dashboard-view} scopes))
    (sync-orgs tenant
               groups)

    (and (= :delete event-type)
         (= :group resource-type))
    #(grafana/delete-org {:name (grafana-org-name tenant resource-name)})))