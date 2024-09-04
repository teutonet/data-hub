(ns net.teuto.udh.resource.util
  (:require [clojure.set :refer [subset?]]
            [net.teuto.udh.sync.udh :refer [combine-into-hash to-seq]])
 (:import [jakarta.ws.rs
           ForbiddenException]
          [org.keycloak.authorization.model Resource$FilterOption Scope]
          [org.keycloak.authorization.permission ResourcePermission]
          [org.keycloak.services.resources.admin.permissions AdminPermissions]))

(def ^:dynamic *authz-context* nil)

(def ^:dynamic *handle-request*
  "Handler for recursive requests."
  nil)

(def override-groups-attribute
  "Identity attribute used to set group(s)
   in permission evaluations without a user."
  "data-hub.attribute.groups")

; yes, the open bug relating to our problem
; is from 1999 https://bugs.java.com/bugdatabase/view_bug.do?bug_id=4283544
(defn invoke [obj method-name & args]
  (.invoke (doto (->> obj
                      .getClass
                      .getDeclaredMethods
                      (filter #(-> % .getName #{method-name}))
                      first)
             (.setAccessible true))
           obj
           (into-array args)))

(defn d
  "Debug function for use only during development!
   Prints all arguments (if evaluation finishes without exception)
   and passes the last one on.
   Wrap forms or put into threading macros."
  [& args]
  (last (doto args println)))

(defn hash-names
  "Hash a set of names deterministically
   so they can be used for string-based lookups and unique constraints."
  [names]
  (->> names
       sort
       flatten
       (map str)
       (apply combine-into-hash)))

(defn tenant-group-id
  "Group ID to use for a top-level tenant group."
  [tenant]
  (combine-into-hash tenant))

(defn singular
  "Coerce resource type to singular string."
  [resource-type]
  (name resource-type))

(defn plural
  "Coerce resource type to plural string."
  [resource-type]
  (str (singular resource-type) "s"))

(defn scope-name
  "Format scope name from resource type and scope."
  [resource-type scope]
  (str (name resource-type) ":" (name scope)))

;; attributes

(defn stringify-attributes
  "Converts names map to attributes suitable for resources."
  [attributes]
  (->> attributes
       (map (fn [[k v]] {(name k) v}))
       (into {})))

(defn get-names
  "Converts the attributes of a resource to names."
  [resource]
  (->> resource
       .getAttributes
       (map (fn [[k [v]]] [(keyword k) v]))
       (into {})))

(defn set-attributes
  "Sets names as attributes on a resource."
  [resource names]
  (->> names
       stringify-attributes
       (run! (fn [[k v]] (.setAttribute resource k [v])))))

;; group permissions for Keycloak Admin UI

(defn realm-mgmt-context
  "Create context for managing realm resources such as groups."
  []
  (let [{:keys [session realm]} *authz-context*
        mgmt-permissions (doto (AdminPermissions/management session realm)
                           (invoke "initializeRealmResourceServer")
                           (invoke "initializeRealmDefaultScopes"))
        store-factory (-> mgmt-permissions .authz .getStoreFactory)]
    {:mgmt-permissions mgmt-permissions
     :policy-store (.getPolicyStore store-factory)
     :resource-server (-> store-factory
                          .getResourceServerStore
                          (.findByClient (.getRealmManagementClient mgmt-permissions)))}))

(defn enable-group-authz [group-model]
  (-> (realm-mgmt-context)
      :mgmt-permissions
      .groups
      (.setPermissionsEnabled group-model true)))

;; resources

(defn lookup-resources [names resource-type]
  (let [{:keys [resource-store realm resource-server]} *authz-context*]
    (->> (.find resource-store realm resource-server
                {Resource$FilterOption/TYPE (into-array String [(singular resource-type)])}
                nil nil)
         (filter #(->> %
                       get-names
                       set
                       (subset? (set names)))))))

;; scope management

(defn create-scope
  "Create scope with name."
  [name]
  (let [{:keys [scope-store resource-server]} *authz-context*]
    (or (.findByName scope-store
                     resource-server
                     name)
        (.create scope-store
                 resource-server
                 name))))

;; permission checks

(defn has-permissions [resource scopes]
  (let [{:keys [auth-provider resource-server evaluation-context]} *authz-context*
        resource-type-str (.getType resource)
        requested-scopes (->> scopes
                              (map #(if (instance? Scope %)
                                      %
                                      (create-scope
                                       (if (string? %)
                                         %
                                         (scope-name resource-type-str %)))))
                              set)
        granted-count (some-> auth-provider
                              .evaluators
                              (.from [(ResourcePermission. resource
                                                           requested-scopes
                                                           resource-server)]
                                     evaluation-context)
                              (.evaluate resource-server nil)
                              to-seq
                              first
                              .getScopes
                              count)]
    (= granted-count (count scopes))))

(defn has-permission [resource scope]
  (has-permissions resource #{scope}))

(defn ensure-permissions [resource scopes]
  (when-not (has-permissions resource scopes)
    (throw (new ForbiddenException))))

(defn ensure-permission [resource scope]
  (ensure-permissions resource #{scope}))