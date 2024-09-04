(ns test-resources "Integration tests for data-hub resources"
    (:require [clojure.string :as str]
              [clojure.test :as t :refer [deftest is]]
              [net.teuto.udh.sync.udh :as common :refer [json-payload
                                                         random-name]]
              [taoensso.timbre :as timbre]))

(timbre/set-level! :info)

(def keycloak-host (get (System/getenv)
                        "KEYCLOAK_HOST"
                        "localhost:8080"))

;; utils

(defn token [user]
  (binding [common/*host* (str keycloak-host
                               "/realms/master")]
    (-> (common/http "/protocol/openid-connect/token"
                     {:method :post
                      :form-params
                      {:client_id "data-hub" ; settings for integration test environment
                       :client_secret "secret"
                       :grant_type "password"
                       :password user
                       :username user}})
        :access_token)))

(def ^:dynamic *user* "admin")
(defn http [path {:keys [assert-status assert-body json] :as opts}]
  (binding [common/*host* (or common/*host* (str keycloak-host
                                                 "/realms/master/data-hub"))
            common/*bearer* (token *user*)]
    (let [response
          (common/http path
                       (merge {:return identity}
                              opts
                              (when assert-status {:throw false})
                              (when json (json-payload json))))]
      (let [{:keys [body status]} response]
        (when assert-status (is (= assert-status status)))
        (when assert-body (is (-> body common/json-decode assert-body)
                              (str "body is " body))))
      response)))

(defn create-user [& groups]
  (binding [common/*host* (str keycloak-host
                               "/admin/realms/master")]
    (let [username (random-name)
          id (http "/users"
                   {:method :post
                    :json
                    {:email (str username "@example.com")
                     :username username
                     :groups (map #(str "/" (str/join "/" %))
                                  groups)
                     :enabled true}
                    :return #(-> % :headers (get "location") (str/split #"/") last)})]
      (http (str "/users/" id "/reset-password")
            {:method :put
             :json
             {:temporary false
              :type "password"
              :value username}})
      username)))

(def OK 200)
(def CREATED 201)
(def NO_CONTENT 204)
(def BAD_REQUEST 400)
(def FORBIDDEN 403)
(def NOT_FOUND 404)
(def CONFLICT 409)

(defn create-tenant [& {:keys [groups projects]}]
  (let [tenant (random-name)]
    (http (str "/tenants/" tenant)
          {:method :put})
    (run! #(http (str "/tenants/" tenant "/groups/" %)
                 {:method :put})
          groups)
    (run! #(http (str "/tenants/" tenant "/projects/" %)
                 {:method :put})
          projects)
    tenant))

;; misc API properties

(deftest invalid-json
  (let [tenant (create-tenant)]
    (http (str "/tenants/" tenant "/groups/admin/permissions/foobar")
          {:method :put
           :headers {:content-type "application/json"}
           :body "notjson"
           :assert-status BAD_REQUEST})))

(deftest invalid-schema
  (let [tenant (create-tenant)]
    (doseq [json [{:scopes ["group:view"]
                   :groups [9]}
                  {:scopes ["group:view"]
                   :groups ["admin"]
                   :extra ["something"]}]]
      (http (str "/tenants/" tenant "/groups/admin/permissions/foobar")
            {:method :put
             :json json
             :assert-status BAD_REQUEST}))))

(deftest invalid-name
  (http "/tenants/Invalid"
        {:assert-status BAD_REQUEST}))

(deftest list-valid-scopes
  (http (str "/tenants/" (create-tenant) "/scopes")
        {:assert-status OK
         :assert-body #(-> % :all set (contains? "sensor-credential:rotate"))}))

(deftest list-granted-scopes
  (let [tenant (create-tenant)
        user (create-user [tenant])]
    (http (str "/tenants/" tenant "/scopes")
          {:assert-body #(-> % :granted set (= #{"tenant:admin"
                                                 "tenant:view"}))})

    (http (str "/tenants/" tenant "/permissions/seeallgroups")
          {:method :put
           :json {:scopes ["group:view"]
                  :groups [nil]}})
    (http (str "/tenants/" tenant "/permissions/editdashboards")
          {:method :put
           :json {:scopes ["group:dashboard-edit"]
                  :groups [nil]}})
    (binding [*user* user]
      (http (str "/tenants/" tenant "/groups/admin/scopes")
            {:assert-body #(-> % :granted set (= #{"group:view" "group:dashboard-edit"}))}))))

;; basic resource management

(deftest tenants
  (let [tenant (random-name)]
    (http (str "/tenants/" tenant)
          {:method :put
           :assert-status CREATED
           :assert-body #{{:name tenant}}})
    (http (str "/tenants/" tenant)
          {:method :put
           :assert-status CONFLICT})

    (http (str "/tenants/" tenant)
          {:assert-status NO_CONTENT})
    (http (str "/tenants")
          {:assert-status OK
           :assert-body #(-> % set (contains? tenant))})

    (http (str "/tenants/" tenant)
          {:method :delete
           :assert-status NO_CONTENT})
    (http (str "/tenants/" tenant)
          {:method :delete
           :assert-status NOT_FOUND})

    (http (str "/tenants")
          {:assert-body #(is (not (-> % set (contains? tenant))))})))

(deftest tenant-name-not-autogenerated
  (http (str "/tenants/" (random-name))
        {:method :post
         :assert-status NOT_FOUND}))

;; tenant setup

(deftest new-tenant-has-admin-group
  (http (str "/tenants/" (create-tenant) "/groups")
        {:assert-body #{["admin"]}}))

(deftest admin-group-has-tenant-admin
  (http (str "/tenants/" (create-tenant) "/permissions/admin")
        {:assert-body #{{:scopes ["tenant:admin"]
                         :groups ["admin"]}}}))

(deftest toplevel-group-has-tenant-view
  (http (str "/tenants/" (create-tenant) "/permissions/members")
        {:assert-body #{{:scopes ["tenant:view"]
                         :groups [nil]}}}))

(deftest new-user-can-only-see-their-tenant
  (let [tenant (create-tenant)
        _other-tenant (create-tenant)]
    (binding [*user* (create-user [tenant])]
      (http (str "/tenants")
            {:assert-body #{[tenant]}}))))

(deftest new-user-can't-see-groups
  (let [tenant (create-tenant)]
    (binding [*user* (create-user [tenant])]
      (http (str "/tenants/" tenant "/groups")
            {:assert-body empty?}))))

;; permissions

(deftest create-update-permission
  (let [tenant (create-tenant)
        initial-permission {:scopes ["group:admin"]
                            :groups ["admin"]}
        updated-permission {:scopes ["group:view"]
                            :groups ["admin"]}]
    (http (str "/tenants/" tenant "/groups/admin/permissions/foobar")
          {:method :put
           :assert-status CREATED
           :json initial-permission})
    (http (str "/tenants/" tenant "/groups/admin/permissions/foobar")
          {:method :put
           :assert-status NO_CONTENT
           :json updated-permission})
    (http (str "/tenants/" tenant "/groups/admin/permissions")
          {:assert-body #{[(assoc updated-permission
                                  :name
                                  "foobar")]}})))

(deftest list-permissions
  (http (str "/tenants/" (create-tenant) "/permissions")
        {:assert-body #(-> % set (contains? {:name "members"
                                             :scopes ["tenant:view"]
                                             :groups [nil]}))}))

(deftest delete-permission
  (let [tenant (create-tenant)]
    (http (str "/tenants/" tenant "/permissions/admin")
          {:method :delete
           :assert-status NO_CONTENT})
    (http (str "/tenants/" tenant "/permissions")
          {:assert-body #(->> % (map :name) (some #{"admin"}) not)})))

(deftest permission-not-found
  (let [tenant (create-tenant)]
    (http (str "/tenants/" tenant "/permissions/everyoneadmin")
          {:method :put
           :json {:scopes ["tenant:admin"]
                  :groups [nil]}})
    (binding [*user*  (create-user [tenant])]
      (http (str "/tenants/" tenant "/permissions/doesnotexist")
            {:method :delete
             :assert-status NOT_FOUND}))))

(deftest group-delete-deletes-permission
  (let [tenant (create-tenant {:groups #{"group1" "group2"}})]
    (http (str "/tenants/" tenant "/permissions/twogroups")
          {:method :put
           :json {:scopes ["tenant:admin"]
                  :groups ["group1" "group2"]}})

    (http (str "/tenants/" tenant "/groups/group1")
          {:method :delete})
    (http (str "/tenants/" tenant "/permissions/twogroups")
          {:assert-body #(-> % :groups (= ["group2"]))})

    (http (str "/tenants/" tenant "/groups/group2")
          {:method :delete})
    (http (str "/tenants/" tenant "/permissions/twogroups")
          {:assert-status NOT_FOUND})))

(deftest resource-delete-deletes-permission
  (let [tenant (create-tenant {:groups #{"foo"}})]
    (http (str "/tenants/" tenant "/groups/foo/permissions/bar")
          {:method :put
           :json {:scopes ["group:view"]
                  :groups ["admin"]}})

    (http (str "/tenants/" tenant "/groups/foo")
          {:method :delete})
    (http (str "/tenants/" tenant "/groups/foo")
          {:method :put})

    (http (str "/tenants/" tenant "/groups/foo/permissions")
          {:assert-body empty?})))

(deftest invalid-scope
  (let [tenant (create-tenant)]
    (http (str "/tenants/" tenant "/groups/admin/permissions/foobar")
          {:method :put
           :json {:scopes ["lorawan-credential:view"]
                  :groups ["admin"]}
           :assert-status BAD_REQUEST})))

(deftest group-in-permission-not-found
  (let [tenant (create-tenant)]
    (http (str "/tenants/" tenant "/groups/admin/permissions/foobar")
          {:method :put
           :json {:scopes ["group:view"]
                  :groups ["doesnotexist"]}
           :assert-status NOT_FOUND})))

(deftest two-scopes-groups-#159
  (let [tenant (create-tenant)]
    (http (str "/tenants/" tenant "/permissions/foobar")
          {:method :put
           :json {:scopes ["group:admin"]
                  :groups ["admin" nil]}})
    (http (str "/tenants/" tenant "/permissions") {})))

;; hierarchy

(deftest group-needs-tenant
  (http (str "/tenants/" (random-name) "/groups/" (random-name))
        {:method :put
         :assert-status NOT_FOUND}))

(deftest groups-are-scoped
  (let [group (random-name)]
    (http (str "/tenants/" (create-tenant) "/groups/" group)
          {:method :put})

    (http (str "/tenants/" (create-tenant) "/groups")
          {:assert-body #(-> % set (contains? group) not)})))

(deftest delete-is-recursive
  (let [tenant (create-tenant)
        project (random-name)]
    (http (str "/tenants/" tenant "/projects/" project)
          {:method :put})
    (http (str "/tenants/" tenant)
          {:method :delete})
    (http (str "/tenants/" tenant)
          {:method :put})
    (http (str "/tenants/" tenant "/projects/" project)
          {:assert-status NOT_FOUND})))

;; sub-resource management

(deftest group-create-list-delete
  (let [tenant (create-tenant)
        group (random-name)]
    (http (str "/tenants/" tenant "/groups/" group)
          {:method :put
           :assert-status CREATED})
    (http (str "/tenants/" tenant "/groups")
          {:assert-body #(-> % set (contains? group))})
    (http (str "/tenants/" tenant "/groups/" group)
          {:method :delete
           :assert-status NO_CONTENT})))

;; permission evaluation

(deftest permissions-are-transitive
  (let [tenant (create-tenant)]
    (http (str "/tenants/" tenant "/permissions/viewgroups")
          {:method :put
           :json {:scopes ["group:view"]
                  :groups [nil]}})
    (binding [*user* (create-user [tenant])]
      (http (str "/tenants/" tenant "/groups")
            {:assert-body not-empty}))))

(deftest admin-scope-includes-all
  (let [tenant (create-tenant)]
    (http (str "/tenants/" tenant "/permissions/admingroups")
          {:method :put
           :json {:scopes ["group:admin"]
                  :groups [nil]}})
    (binding [*user* (create-user [tenant])]
      (http (str "/tenants/" tenant "/groups")
            {:assert-body not-empty}))))

(deftest admin-scope-applies-to-subtypes
  (let [tenant (create-tenant)]
    (http (str "/tenants/" tenant "/permissions/everyoneadmin")
          {:method :put
           :json {:scopes ["tenant:admin"]
                  :groups [nil]}})
    (binding [*user* (create-user [tenant])]
      (http (str "/tenants/" tenant "/groups")
            {:assert-body not-empty})))
  
  ; :admin not at top-level
  (let [tenant (create-tenant {:projects #{"p1"}})
        cred-path (str "/tenants/" tenant "/projects/p1/sensor-credentials/cred1")]
    (http (str "/tenants/" tenant "/projects/p1/permissions/projectadmin")
          {:method :put
           :json {:scopes ["project:admin"]
                  :groups [nil]}})
    (http cred-path {:method :put})
    (binding [*user* (create-user [tenant])]
      (http cred-path
            {:assert-status NO_CONTENT}))))

;; permission requirements

(deftest resource-management-requires-admin-on-parent
  (let [tenant (create-tenant)
        user (create-user [tenant])]
    (binding [*user* user]
      (http (str "/tenants/" tenant "/groups/newgroup")
            {:method :put
             :assert-status FORBIDDEN})
      (http (str "/tenants/" tenant "/groups/admin")
            {:method :delete
             :assert-status FORBIDDEN}))

    (http (str "/tenants/" tenant "/permissions/everyoneadmin")
          {:method :put
           :json {:scopes ["tenant:admin"]
                  :groups [nil]}})
    (binding [*user* user]
      (http (str "/tenants/" tenant "/groups/newgroup")
            {:method :put})
      (http (str "/tenants/" tenant "/groups/admin")
            {:method :delete}))))

(deftest permission-management-requires-admin
  (let [tenant (create-tenant)
        user (create-user [tenant])
        permission {:scopes ["tenant:admin"]
                    :groups [nil]}]
    (binding [*user* user]
      (http (str "/tenants/" tenant "/permissions")
            {:assert-status FORBIDDEN})
      (http (str "/tenants/" tenant "/permissions/doesnotexist")
            {:method :delete
             :assert-status FORBIDDEN})
      (http (str "/tenants/" tenant "/permissions/usercreatedthing")
            {:method :put
             :json permission
             :assert-status FORBIDDEN})
      (http (str "/tenants/" tenant "/permissions/admin")
            {:method :delete
             :assert-status FORBIDDEN}))

    (http (str "/tenants/" tenant "/permissions/everyoneadmin")
          {:method :put
           :json {:scopes ["tenant:admin"]
                  :groups [nil]}})
    (binding [*user* user]
      (http (str "/tenants/" tenant "/permissions/usercreatedthing")
            {:method :put
             :json permission}))))

(deftest multiple-scopes-and-groups-don't-cause-problems
  (let [tenant (create-tenant {:groups #{"sub" "sub2"} :projects #{"p"}})
        user (create-user [tenant "sub"])]
    (http (str "/tenants/" tenant "/projects/p/permissions/read-access")
          {:method :put
           :json {:scopes ["project:view" "project:prometheus-read"]
                  :groups ["sub" "sub2"]}})

    (binding [*user* user]
      (http (str "/tenants/" tenant "/projects")
            {:assert-body #{["p"]}}))))

(deftest only-visible-groups-can-be-added
  (let [tenant (create-tenant {:groups #{"foo"}})
        permission {:scopes ["group:view"]
                    :groups ["admin"]} ; admin group not visible for user
        ]
    (http (str "/tenants/" tenant "/groups/foo/permissions/fooadmin")
          {:method :put
           :json {:scopes ["group:admin"]
                  :groups [nil]}})
    (binding [*user* (create-user [tenant])]
      (http (str "/tenants/" tenant "/groups/foo/permissions/cantbecreated")
            {:method :put
             :json permission
             :assert-status NOT_FOUND}))

    (http (str "/tenants/" tenant "/groups/foo/permissions/cantbecreated")
          {:method :put
           :json permission})

    ; if created by someone else name is visible
    (http (str "/tenants/" tenant "/groups/foo/permissions/cantbecreated")
          {:assert-body #(-> % :groups set (contains? "admin"))})))

(deftest forbidden-view-as-not-found
  ; if you can't "view" it you should not be able to know that it exists by looking for FORBIDDEN
  (let [tenant (create-tenant {:groups #{"foo"}})]
    (binding [*user* (create-user [tenant])]
      (http (str "/tenants/" tenant "/groups/foo")
            {:assert-status NOT_FOUND}))))

;; sensor-credential

(defn plausible-credential [c]
  (->> c
       ((juxt :username :password))
       (every? (comp not str/blank?))))

(deftest create-delete-credential
  (let [cred-path (str "/tenants/" (create-tenant {:projects #{"p1"}}) "/projects/p1/sensor-credentials/cred1")]
    (http cred-path {:method :put
                     :assert-status OK
                     :assert-body plausible-credential})

    (http cred-path {:method :delete
                     :assert-status NO_CONTENT})))

(deftest rotate-credential
  (let [cred-path (str "/tenants/" (create-tenant {:projects #{"p1"}}) "/projects/p1/sensor-credentials/cred1")]
    (http cred-path {:method :put})

    (http (str cred-path "/rotate")
          {:method :post
           :assert-status OK
           :assert-body plausible-credential})))

;; run tests

(defn cleanup []
  (->> (http "/tenants" {})
       :body
       common/json-decode
       (run! #(http (str "/tenants/" %)
                    {:method :delete}))))

(defn run-tests []
  (let [{:keys [fail error]} (t/run-tests 'test-resources)]
    (if (pos? (+ fail error))
      (System/exit 1)
      (cleanup))))
