(ns net.teuto.udh.sync.chirpstack
  "Main synchronization code for Grafana orgs and users."
  (:require [net.teuto.udh.sync.udh :as common :refer [json-payload]]
            [taoensso.timbre :refer [info]]))

;; environment

(def chirpstack-host (or (System/getenv "CHIRPSTACK_HOST") "localhost:8090"))
(def chirpstack-api-key (or (System/getenv "CHIRPSTACK_API_KEY") ""))

(defn http [path opts]
  (binding [common/*host* chirpstack-host
            common/*bearer* chirpstack-api-key]
    (common/http path opts)))

(def no-limit {:query-params {:limit Integer/MAX_VALUE}})

;; tenants

(defn existing-tenants
  ([]
   (existing-tenants nil))
  ([user-id]
   (->> (http "/api/tenants" (merge-with merge
                                         no-limit
                                         {:query-params {:userId user-id}}))
        :result)))

(defn lookup-tenant-ids [names]
  (let [name-set (set names)]
    (->> (existing-tenants)
         (filter #(-> % :name name-set))
         (map :id)
         set)))

(defn delete-tenant [{:keys [id name]}]
  (info "Deleting tenant" name)
  (http (str "/api/tenants/" id)
        {:method :delete}))

(defn create-tenant [name]
  (info "Creating tenant" name)
  (http (str "/api/tenants")
        (merge (json-payload {:tenant {:name name
                                       :canHaveGateways true}})
               {:method :post})))

(defn sync-tenants [desired-names]
  (common/sync {:existing-fn existing-tenants
                :identifier #(if (string? %)
                               %
                               (:name %))
                :delete-fn delete-tenant
                :create-fn create-tenant
                :resources desired-names}))

;; users

(defn all-users []
  (->> (http "/api/users" no-limit)
       :result))

(defn create-user [payload]
  (info "Creating user" (-> payload :user :email))
  (http "/api/users"
        (merge (json-payload payload)
               {:method :post})))

(defn lookup-user
  "Looks up a user by email address and adds tenant information."
  [email]
  (some->> (all-users)
           (filter #(-> % :email #{email}))
           first
           (#(merge %
                    {:tenants (existing-tenants (:id %))}))))

(defn delete-user [{:keys [id email]}]
  (info "Deleting user" email)
  (http (str "/api/users/" id)
        {:method :delete}))

(defn sync-user
  "Ensures that a user exists and has the correct tenant associations.
   Simply re-creates user if necessaryas there is no state in Chirpstack
   to be preseved apart from active logins."
  [email desired-tenants & {:keys [user]}]
  (let [desired-tenant-ids (lookup-tenant-ids desired-tenants)
        desired-user {:user {:email email
                             :isActive true
                             :isAdmin false}
                      :tenants (map #(hash-map :tenantId %
                                               :isAdmin false
                                               :isGatewayAdmin true
                                               :isDeviceAdmin true)
                                    desired-tenant-ids)}]
    (if-some [user (or user (lookup-user email))]
      (when (and (->> user :tenants (map :id) set (not= (set desired-tenant-ids)))
                 (not (:isAdmin user)))
        (delete-user user)
        (create-user desired-user))
      (create-user desired-user))))

;; CLI

(defn -main
  ([] (-main "help"))
  ([action & args]
   (case action
     "sync-tenants" (do (info "Synchronizing tenants" args)
                        (sync-tenants args))
     "sync-user" (sync-user (first args)
                            (rest args))
     "list-users" (->> (all-users)
                       (map (juxt :id :email))
                       (run! #(apply println %)))
     (run! println
           ["sync-tenants  tenant1 [...]"
            "sync-user     email [tenant1 ...]"
            "list-users"]))))

; execute -main if run as a script or inline
(when (#{(System/getProperty "babashka.file") "<expr>"} *file*)
  (apply -main *command-line-args*))
