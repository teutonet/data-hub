(ns net.teuto.udh.resource.group 
  (:require [net.teuto.udh.resource.util :refer [*authz-context*
                                                 enable-group-authz
                                                 tenant-group-id]]))

(defn create [{{:keys [tenant group]} :names
                     :keys [resource-hash]}]
  (let [{:keys [realm]} *authz-context*]
    (-> (.createGroup realm
                      resource-hash
                      group
                      (.getGroupById realm (tenant-group-id tenant)))
        enable-group-authz)))

(defn delete [{:keys [resource-hash]}]
  (let [{:keys [realm]} *authz-context*]
    (some->> resource-hash
             (.getGroupById realm)
             (.removeGroup realm))))