(ns net.teuto.udh.resource.core
  "Data HUB domain object management."
  ; TODO consider splitting namespace
  (:require [cheshire.core :as json]
            [clojure.set :as set]
            [clojure.string :as str]
            [malli.core :as m]
            [net.teuto.udh.resource.api :refer [api event-handlers]]
            [net.teuto.udh.resource.core :as resources]
            [net.teuto.udh.resource.util :refer [*authz-context*
                                                 *handle-request* create-scope
                                                 ensure-permission get-names
                                                 has-permission
                                                 has-permissions hash-names
                                                 invoke lookup-resources
                                                 override-groups-attribute
                                                 plural realm-mgmt-context
                                                 scope-name set-attributes
                                                 singular tenant-group-id]]
            [net.teuto.udh.sync.udh :as common :refer [random-name]])
  (:import [jakarta.ws.rs
            BadRequestException
            ClientErrorException
            NotAuthorizedException
            NotFoundException]
           [jakarta.ws.rs.core Response Response$ResponseBuilder Response$Status]
           [org.keycloak.connections.jpa JpaConnectionProvider]
           [org.keycloak.authorization AuthorizationProvider]
           [org.keycloak.authorization.common DefaultEvaluationContext UserModelIdentity]
           [org.keycloak.models.utils ModelToRepresentation]
           [org.keycloak.representations.idm.authorization
            DecisionStrategy
            GroupPolicyRepresentation
            GroupPolicyRepresentation$GroupDefinition
            PolicyRepresentation
            ResourcePermissionRepresentation
            ScopePermissionRepresentation]
           [org.keycloak.services.managers AppAuthManager$BearerTokenAuthenticator]
           [org.keycloak.services.resources.admin.permissions AdminPermissions]))

;; environment

(def client-id "data-hub")

(def root "Name of the root resource at the root of the resource tree." "root")

(def ^:dynamic *external-handlers*
  "Functions to call at the very end of handling the outermost request.
   At that point all database code has been executed successfully
   and the risk of an internal failure is low.
   If this fails the database transaction is rolled back without problems,
   the same is not true vice versa.
   This is a best effort solution for the time being,
   if this is not robust enough we have to switch to asynchronous reconciliation with retries."
  nil)

(def run-external-handlers
  "Perform reconciliations external to Keycloak.
   This should always be true except when testing the internal parts in isolation."
  (-> (System/getenv)
      (get "DH_EXTERNAL_RECONCILIATION"
           "true")
      parse-boolean))

;; exceptions

(defn throw-bad-request []
  (throw (new BadRequestException)))
(defn throw-not-found []
  (throw (new NotFoundException)))
(defn throw-conflict []
  (throw (new ClientErrorException Response$Status/CONFLICT)))

;; API utils

(defn get-type
  "Determine iface type."
  [m]
  (or (:type m)
      :root))

(defn routes
  "Determine sub-ifaces."
  [iface]
  (->> iface
       :resources
       (map (fn [[k v]]
              {(plural k)
               (-> v
                   (assoc :type k)
                   (assoc :type-chain (conj (or (:type-chain iface)
                                                [:root])
                                            k)))}))
       (into {})))

(defn get-scopes
  "Get valid scopes for this iface (non-transitive)."
  [iface]
  (let [t (-> iface get-type singular)]
    (->> iface
         :scopes
         (into #{:admin :view})
         (map #(scope-name t %))
         set)))

(defn scopes-for-all-types [iface]
  (let [sub-results (->> iface
                         routes
                         vals
                         (map scopes-for-all-types))]
    (apply merge {(get-type iface) (->> sub-results
                                        (map vals)
                                        (apply concat)
                                        (apply set/union (get-scopes iface)))}
           sub-results)))
(def scopes-for-type
  (scopes-for-all-types api))

(defn all-ifaces [iface]
  (let [sub-results (->> iface
                         routes
                         vals
                         (map all-ifaces))]
    (apply merge {(get-type iface) iface}
           sub-results)))
(def ifaces
  (all-ifaces api))

(def actions-for-type
  (->> ifaces
       (map (fn [[n i]] {n (->> i :action keys (map name) set)}))
       (apply merge)))

(defn resource-types'
  "Determines all resource types in pre-order
   (suitable for determining hierarchy)."
  [iface]
  (->> iface
       routes
       vals
       (map resource-types')
       (apply concat [(get-type iface)])))
(def resource-types
  (resource-types' api))

(defn determine-type-chain
  "Determine type chain for existing resource."
  [names]
  (let [valid-types (set resource-types)
        indices (->> resource-types
                     (map-indexed (fn [i t] [t i]))
                     (into {}))]
    (conj (->> names
               keys
               (filter valid-types)
               (sort-by indices))
          :root)))

(defn select-names [names resource-type]
  (->> resource-types
       (take-while (comp not #{resource-type}))
       (into #{resource-type})
       (select-keys names)))

(defn manual-naming
  "Can iface names be set manually?"
  [iface]
  (:manual-naming iface))

(defn automatic-naming
  "Can iface names be set automatically?"
  [iface]
  (not (manual-naming iface)))

;; authz context

(defn evaluation-context
  "Constructs an evaluation context from a Keycloak session and a user model."
  [session user]
  (let [identity (new UserModelIdentity
                      (-> session .getContext .getRealm)
                      user)]
    (new DefaultEvaluationContext identity session)))

(defn authz-context [session evaluation-context]
  (let [realm (-> session .getContext .getRealm)
        client (.getClientByClientId realm client-id)
        auth-provider (-> session (.getProvider AuthorizationProvider))
        store-factory (.getStoreFactory auth-provider)]
    {:session session
     :realm realm
     :evaluation-context evaluation-context
     :auth-provider auth-provider
     :owner (.getId client)
     :resource-server (-> store-factory .getResourceServerStore (.findByClient client))
     :resource-store (.getResourceStore store-factory)
     :scope-store (.getScopeStore store-factory)
     :policy-store (.getPolicyStore store-factory)
     :entity-manager (-> session (.getProvider JpaConnectionProvider) .getEntityManager)}))

;; validation

(defn ensure-name-valid [n]
  (when-not (re-matches #"[a-z0-9]([-a-z0-9]{0,34}[a-z0-9])?" n)
    (throw-bad-request)))

(defn validated-body
  "Creates a wrapper function that
   optionally pre-processes the body with fns
   then validates it against the spec it is called with
   and only on successful validation returns the body.
   Throws bad request exception on validation failure.
   This ensures that a body can only be accessed if a spec is provided."
  [body & fns]
  (let [preprocess (apply comp
                          (reverse fns))]
    #(let [preprocessed (preprocess body)]
       (if-not (m/validate % preprocessed)
         (throw-bad-request)
         preprocessed))))

;; scope management

(defn create-iface-scopes
  "Create all scopes for iface."
  [iface]
  (->> iface
       get-scopes
       (map create-scope)
       set))

;; resources

(defn lookup-resource [names resource-type]
  (-> (lookup-resources names resource-type)
      first
      (or (throw-not-found))))

(defn find-resource-by-id [id]
  (let [{:keys [resource-store
                resource-server]} *authz-context*]
    (.findByName resource-store resource-server id)))

(defn ensure-resource-id-exists [id]
  (or (find-resource-by-id id)
      (throw-not-found)))

(defn ensure-resource-id-unused [id]
  (when (find-resource-by-id id)
    (throw-conflict)))

(declare execute)
(defn delete-descendants
  "Deletes all descendants of a resource in bottom-up order."
  [{:keys [names resource-type]}]
  (->> resource-types
       reverse
       (take-while (comp not #{resource-type}))
       (map #(lookup-resources (select-names names %)
                               %))
       (apply concat)
       (map (fn [r]
              {:op :delete
               :iface (-> r .getType keyword ifaces)
               :names (get-names r)}))
       (run! execute)))

;; policy management ("permissions" are also policies)

(defn lookup-policy
  "Look up policy by its name."
  [p]
  (let [{:keys [policy-store resource-server]} *authz-context*]
    (some-> (.findByName policy-store resource-server (.getName p))
            .getId)))

(defn create-policy [p]
  (let [{:keys [policy-store resource-server]} *authz-context*]
    (-> (.create policy-store resource-server p)
        .getId)))

(defn ensure-policy [p]
  (or (lookup-policy p)
      (create-policy p)))

(defn lookup-permission [resource permission]
  (let [{:keys [policy-store resource-server]} *authz-context*]
    (->> (.findByResource policy-store resource-server resource)
         (filter #(-> % .getDescription (= permission)))
         first)))

;; authz setup

(defn data-hub-policy
  "Get data-hub policy for current *authz-context*."
  []
  (ensure-policy (doto (PolicyRepresentation.)
                   (.setType "data-hub")
                   (.setName "data-hub")
                   (.setDescription "data-hub specific authorization"))))

(def kc-group-type
  "Resource type that Keycloak uses for groups."
  "Group")

(defn ensure-realm-mgmt-permission
  "Ensure that realm-management permissions are set up
   to allow user management in Admin UI."
  []
  (binding [*authz-context* (realm-mgmt-context)]
    (let [{:keys [mgmt-permissions]} *authz-context*]
      (ensure-policy (doto (ScopePermissionRepresentation.)
                       (.setName "user-management")
                       (.setDescription "Allow user management based on data-hub permissions")
                       (.setResourceType kc-group-type)
                       (.setScopes
                        (->> [(invoke mgmt-permissions "realmViewScope")
                              (invoke mgmt-permissions "initializeRealmScope" "manage-members")
                              (invoke mgmt-permissions "initializeRealmScope" "manage-membership")]
                             (map #(.getName %))
                             set))
                       (.setPolicies #{(data-hub-policy)}))))))

(defn ensure-global-permissions
  "Ensure that global authz aspects like the root resource
   and type-level permissions are set up."
  []
  (ensure-realm-mgmt-permission)
  (let [{:keys [realm owner policy-store resource-store resource-server]} *authz-context*]
    (.setDecisionStrategy resource-server DecisionStrategy/AFFIRMATIVE)
    (run! #(some->> %
                    (.findByName policy-store resource-server)
                    .getId
                    (.delete policy-store realm))
          ["Default Permission"
           "Default Policy"])
    (some->> "Default Resource"
             (.findByName resource-store resource-server)
             .getId
             (.delete resource-store realm))
    (or (.findByName resource-store resource-server root)
        (doto (.create resource-store resource-server root owner)
          (.setType root))))
  (->> resource-types
       (map singular)
       (run! #(ensure-policy (doto (ResourcePermissionRepresentation.)
                               (.setName (str "datahub:" %))
                               (.setDescription (str "Data HUB custom permissions on " %))
                               (.setResourceType %)
                               (.setPolicies #{(data-hub-policy)}))))))

;; permissions API

(defn permission-to-rep [permission & {:keys [include-name]}]
  (let [{:keys [realm auth-provider]} *authz-context*]
    (merge {:scopes (->> permission
                         .getScopes
                         (map #(.getName %)))
            :groups (->> permission
                         .getAssociatedPolicies
                         (map #(-> %
                                   (ModelToRepresentation/toRepresentation auth-provider false false)
                                   .getGroups
                                   set))
                         (apply set/union)
                         (map #(.getGroupById realm (.getId %)))
                         (map #(when (.getParent %)
                                 (.getName %))))}
           (when include-name {:name (.getDescription permission)}))))

(defn ensure-scopes-valid-for-type [resource-types scopes]
  (let [valid (scopes-for-type resource-types)]
    (if (every? valid scopes)
      scopes
      (throw-bad-request))))

(defn get-permission [{{:keys [permission]} :names
                       :keys [resource]}]
  (ensure-permission @resource :admin)
  (if-let [permission (lookup-permission @resource permission)]
    {:result (permission-to-rep permission)}
    (throw-not-found)))

(defn delete-permission [{{:keys [permission]} :names
                          :keys [realm resource]}]
  (ensure-permission @resource :admin)
  (let [{:keys [policy-store entity-manager]} *authz-context*
        permission (lookup-permission @resource permission)]
    (when-not permission
      (throw-not-found))
    (.delete policy-store realm (.getId permission))
    ; without flushing, re-creating with same name in same transaction fails
    (.flush entity-manager)))

(defn create-permission
  "Create Keycloak permissions/policies
   according to validated permission definition from request."
  ; TODO extract functions
  [{{:keys [tenant permission] :as names} :names
    :keys [resource resource-type]
    :as rctx}
   body]
  (ensure-permission @resource :admin)
  (let [req (body [:map {:closed true}
                   [:scopes [:vector :string]]
                   [:groups [:vector [:maybe :string]]]])
        scopes (->> req
                    :scopes
                    (ensure-scopes-valid-for-type resource-type)
                    set
                    (map #(->> %
                               create-scope
                               .getId))
                    set)
        group-policies (->> req
                            :groups
                            set
                            (map #(let [group-id (if-not %
                                                   (tenant-group-id tenant)
                                                   (let [group-hash (hash-names {:tenant tenant
                                                                                 :group %})]
                                                     (when-not (some-> (find-resource-by-id group-hash)
                                                                       (has-permission :view))
                                                       (throw-not-found))
                                                     group-hash))
                                        group-definition (new GroupPolicyRepresentation$GroupDefinition
                                                              group-id
                                                              true)]
                                    (ensure-policy (doto (GroupPolicyRepresentation.)
                                                     (.setName group-id)
                                                     (.setGroupsClaim override-groups-attribute)
                                                     (.setDescription (str tenant " / " %))
                                                     (.setGroups #{group-definition})))))
                            set)
        exists (lookup-permission @resource permission)]
    (when exists
        ; update through delete + recreate
      (delete-permission rctx))
    (create-policy (doto (ScopePermissionRepresentation.)
                     (.setName (hash-names names))
                     (.setResources #{(.getId @resource)})
                     (.setScopes scopes)
                     (.setPolicies group-policies)
                     (.setDecisionStrategy DecisionStrategy/AFFIRMATIVE)
                     (.setDescription permission)))
    {:updated exists}))

(defn list-permissions [{:keys [resource]}]
  (ensure-permission @resource :admin)
  (let [{:keys [policy-store resource-server]} *authz-context*]
    {:result (->> (.findByResource policy-store resource-server @resource)
                  (map #(permission-to-rep % {:include-name true})))}))

;; events

(defn event
  "Handle self-generated event."
  [t & extra]
  (let [e (apply merge {:event-type t} extra)]
    (run! #(when-let [h (% e)]
             (swap! *external-handlers* conj h))
          event-handlers)))

;; operations

(defn parse-intent
  "Determine what the client wants to do and return that intent as a map."
  ; TODO extract functions
  ([path iface method]
   (parse-intent path iface method {}))
  ([[rtype rname & prest] iface method names]
   (some-> rname ensure-name-valid)
   (if-let [sub ((routes iface) rtype)]
     (let [sub-type (get-type sub)
           names' (assoc names sub-type rname)]
       (cond
         (and rname
              (not prest)
              (#{:get :delete} method)) {:op method
                                         :iface sub
                                         :names names'}
         (and rname
              (not prest)
              (manual-naming sub)
              (#{:put} method)) {:op (if (= :put method) :create method)
                                 :iface sub
                                 :names names'}
         (and (not rname)
              (-> method #{:get})) {:op :list
                                    :iface sub
                                    :names names}
         rname (parse-intent prest
                             sub
                             method
                             names')
         (and (not rname)
              (automatic-naming sub)
              (-> method #{:post})) {:op :create
                                     :iface sub
                                     :names (assoc names
                                                   sub-type
                                                   (random-name))}
         :else (throw-not-found)))
     (cond
       (= "permissions" rtype)
       (cond
         (and (not rname)
              (-> method #{:get})) {:op :list-permissions
                                    :iface iface
                                    :names names}
         (and rname
              (not prest)
              (-> method #{:get
                           :put
                           :delete})) {:op (case method
                                             :get :get-permission
                                             :put :create-permission
                                             :delete :delete-permission)
                                       :iface iface
                                       :names (assoc names
                                                     :permission
                                                     rname)}
         :else (throw-not-found))

       (= "scopes" rtype)
       (if (and (not rname)
                (-> method #{:get})) {:op :list-scopes
                                      :iface iface
                                      :names names}
           (throw-not-found))

       (-> iface :type actions-for-type (contains? rtype))
       (if (and (not rname)
                (-> method #{:post})) {:op :action
                                       :iface iface
                                       :names names
                                       :action (keyword rtype)}
           (throw-not-found))

       :else (throw-not-found)))))

(defn check-permissions
  "Check additional permissions before executing operation."
  [{{:keys [type-chain]} :iface
    :keys [names op]}]
  (let [ensure (fn [resource-type scope]
                 (-> names
                     (select-names resource-type)
                     (lookup-resource resource-type)
                     (ensure-permission scope)))]
    (doseq [resource-type (-> type-chain rest butlast)]
      (ensure resource-type :view))
    (when (#{:create :delete} op)
      (-> type-chain
          butlast
          last
          (ensure :admin)))))

(def default-hook
  "Default post-op hooks to be used if not overridden for resource type."
  {:get (fn [_ctx] (Response/noContent))
   :create #(-> (Response/status 201)
                (.entity {"name" (:resource-name %)}))
   :delete (fn [_ctx] (Response/noContent))
   :list :result

   :get-permission :result
   :create-permission #(-> (Response/status (if (:updated %) 204 201))
                           (.entity {"name" (-> % :names :permission)}))
   :delete-permission (fn [_ctx] (Response/noContent))
   :list-permissions :result

   :list-scopes :result

   :action :result})

(defn get-hook [iface op]
  (get-in iface
          [:hook op]
          (op default-hook)))

(defn execute
  "Execute the desired operation."
  ; TODO extract functions
  ([intent] (execute intent nil))
  ([{:keys [op iface names action]} body]
   (let [{:keys [realm
                 resource-store
                 resource-server
                 owner]} *authz-context*
         resource-type (get-type iface)
         resource-type-str (singular resource-type)
         resource-hash (hash-names (dissoc names :permission))
         resource-name (names resource-type)
         resource (delay (let [r (ensure-resource-id-exists resource-hash)]
                           (when-not (has-permission r :view)
                             (throw-not-found))
                           r))
         rctx {:resource-type resource-type
               :resource-type-str resource-type-str
               :resource-hash resource-hash
               :resource-name resource-name
               :resource resource
               :names names}
         result-context
         (merge rctx
                (case op
                  :get (do @resource
                           {})
                  :create (do (ensure-resource-id-unused resource-hash)
                              (doto (.create resource-store
                                             resource-server
                                             resource-hash
                                             resource-hash
                                             owner)
                                (set-attributes names)
                                (.setType resource-type-str)
                                (.updateScopes (create-iface-scopes iface))
                                (.setDisplayName resource-name))
                              {})
                  :delete (do (delete-descendants rctx)
                              (.delete resource-store
                                       realm
                                       (.getId @resource))
                              {})
                  :list (->> (lookup-resources names resource-type)
                             (filter #(has-permission % :view))
                             (mapv #(.getSingleAttribute % resource-type-str))
                             (hash-map :result))

                  :get-permission (get-permission rctx)
                  :create-permission (create-permission rctx body)
                  :delete-permission (delete-permission rctx)
                  :list-permissions (list-permissions rctx)

                  :list-scopes {:result
                                {:all (scopes-for-type resource-type)
                                 :granted (->> resource-type
                                               ifaces
                                               get-scopes
                                               (filterv #(has-permission @resource %)))}}

                  :action (do @resource
                              {:result ((-> iface :action action)
                                        rctx)})))
         hook-result ((get-hook iface op) result-context)]
     (event op result-context)
     (if (or (map? hook-result)
             (some #(instance? % hook-result)
                   [Response Response$ResponseBuilder]))
       hook-result
       ((default-hook op) result-context)))))

;; request handling

(defn handle-request
  "Main handling logic, can be called recursively."
  ([path method]
   (handle-request path method nil))
  ([path method body]
   (binding [*handle-request* handle-request]
     (-> (doto (parse-intent path api method)
           check-permissions)
         (execute (if (fn? body)
                    body
                    (validated-body body)))))))

(defn postprocess-response
  "Postprocess response,
   allows for more convenient Response construction
   and through manual JSON encoding properly handles keywords in response."
  [response]
  (let [original-builder (if (instance? Response$ResponseBuilder response)
                           response
                           (Response/ok response))
        encoded-builder (.clone original-builder)]
    (some->> original-builder
             .build
             .getEntity
             json/generate-string
             (.entity encoded-builder)
             .build)))

(defn handle-http-request
  "Entry point for HTTP request handling,
   sets up authz context."
  [session path method body]
  (binding [*authz-context*
            (let [auth-result (or (-> session
                                      (AppAuthManager$BearerTokenAuthenticator.)
                                      (.setAudience client-id)
                                      .authenticate)
                                  (throw (new NotAuthorizedException
                                              "Bearer"
                                              (to-array []))))]
              (->> auth-result
                   .getUser
                   (evaluation-context session)
                   (authz-context session)))
            *external-handlers* (atom [])]
    (ensure-global-permissions)

    (let [r (->> (validated-body body common/json-decode)
                 (handle-request path method)
                 postprocess-response)]
      (when run-external-handlers
        (run! #(%)
              @*external-handlers*))
      r)))

;; custom policy

(defn parent-resource
  "Determine parent resource."
  [resource]
  (let [names (get-names resource)
        type-chain (determine-type-chain names)]
    (when-let [parent-type (-> type-chain butlast last)]
      (-> names
          (select-names parent-type)
          (lookup-resource parent-type)))))

(defn evaluate-policy
  "Evaluates the custom policy."
  ; TODO extract two cases
  [^org.keycloak.authorization.policy.evaluation.Evaluation evaluation]
  (let [auth-provider (.getAuthorizationProvider evaluation)
        session (.getKeycloakSession auth-provider)]
    (binding [*authz-context* (authz-context session
                                             (.getContext evaluation))]
      (let [realm (.getRealm auth-provider)
            client (->> evaluation
                        .getPermission
                        .getResource
                        .getResourceServer
                        .getClientId
                        (.getClientById realm))
            resource-client-id (.getClientId client)
            realm-mgmt-client (-> session
                                  (AdminPermissions/management realm)
                                  .getRealmManagementClient
                                  .getClientId)
            resource (->> evaluation
                          .getPermission
                          .getResource)
            scopes (-> evaluation
                       .getPermission
                       .getScopes)]
        (cond (and (= resource-client-id client-id)
                   (or (-> evaluation
                           .getContext
                           .getIdentity
                           (.hasClientRole realm-mgmt-client "manage-realm"))
                       (and (-> (map #(.getName %) scopes)
                                set
                                (contains? (scope-name (.getType resource)
                                                       :admin))
                                not)
                            (has-permission resource :admin))
                       (some-> resource
                               parent-resource
                               (has-permissions scopes))))
              (.grant evaluation)

              (-> realm-mgmt-client
                  (= resource-client-id))
              (let [resource (-> evaluation
                                 .getPermission
                                 .getResource)]
                (when (-> resource .getType (= kc-group-type))
                  (let [group (->> (str/split (.getName resource) #"\.")
                                   last
                                   (.getGroupById realm))
                        group-name (.getName group)
                        parent-group-name (some-> group .getParent .getName)]
                    (when (if parent-group-name
                            (-> {:tenant parent-group-name
                                 :group group-name}
                                hash-names
                                find-resource-by-id
                                (has-permission :admin))

                            (->> (lookup-resources {:tenant group-name}
                                                   :group)
                                 (some #(has-permission % :admin))))
                      (.grant evaluation))))))))))

(defn get-for-user
  "Returns all names of resources that kc-user has scope permission for."
  [session kc-user resource-type scope]
  (binding [*authz-context* (->> kc-user
                                 (evaluation-context session)
                                 (authz-context session))]
    (->> (lookup-resources {} resource-type)
         (filter #(has-permission % scope))
         (map get-names)
         set)))