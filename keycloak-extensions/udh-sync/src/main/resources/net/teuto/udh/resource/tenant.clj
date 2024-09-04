(ns net.teuto.udh.resource.tenant
  (:require [net.teuto.udh.resource.util :refer [*authz-context*
                                                 *handle-request*
                                                 enable-group-authz
                                                 realm-mgmt-context
                                                 tenant-group-id]]))

(defn grant-user-mgmt-realm-roles [group-model]
  (let [mgmt-client (-> (realm-mgmt-context)
                        :mgmt-permissions
                        .getRealmManagementClient)]
    (->> ["query-users" "query-groups"]
         (run! #(.grantRole group-model
                            (.getRole mgmt-client %))))))

(defn create [{{:keys [tenant]} :names}]
  (let [{:keys [realm]} *authz-context*]
    (doto (.createGroup realm
                        (tenant-group-id tenant)
                        tenant)
      enable-group-authz
      grant-user-mgmt-realm-roles)
    (*handle-request* ["tenants" tenant "groups" "admin"] :put)
    (*handle-request* ["tenants" tenant "permissions" "admin"]
                      :put
                      {:scopes ["tenant:admin"]
                       :groups ["admin"]})
    (*handle-request* ["tenants" tenant "permissions" "members"]
                      :put
                      {:scopes ["tenant:view"]
                       :groups [nil]})
    nil))

(defn delete [{{:keys [tenant]} :names}]
  (let [{:keys [realm]} *authz-context*]
    (some->> (tenant-group-id tenant)
             (.getGroupById realm)
             (.removeGroup realm))))