(ns net.teuto.udh.resource.sensor-credential
  (:require [cheshire.core :as json]
            [net.teuto.udh.resource.util :refer [*authz-context*]]
            [net.teuto.udh.sync.udh :refer [random-name to-seq]]
            [net.teuto.udh.resource.event.grafana :refer [get-flat-project-name]])
  (:import [org.keycloak.representations.idm ClientRepresentation ProtocolMapperRepresentation]
           [org.keycloak.services.managers ClientManager RealmManager]))

(def hash-attribute "hash")

(defn mapper [t m]
  (doto (new ProtocolMapperRepresentation)
    (.setName (random-name))
    (.setProtocol "openid-connect")
    (.setProtocolMapper t)
    (.setConfig m)))

(defn create [{{:keys [tenant project]} :names
               :keys [resource-hash]}]
  (let [{:keys [session realm]} *authz-context*
        client-rep (doto (new ClientRepresentation)
                     (.setStandardFlowEnabled false)
                     (.setPublicClient false)
                     (.setServiceAccountsEnabled true)
                     (.setDefaultClientScopes [])
                     (.setOptionalClientScopes [])
                     (.setAttributes {hash-attribute resource-hash})
                     (.setProtocolMappers [(mapper "oidc-hardcoded-claim-mapper"
                                                   {"claim.name" "projects"
                                                    "claim.value" (-> [(get-flat-project-name tenant project)] json/encode)
                                                    "jsonType.label" "JSON"
                                                    "access.token.claim" "true"})
                                           (mapper "oidc-hardcoded-claim-mapper"
                                                   {"claim.name" "groups"
                                                    "claim.value" (get-flat-project-name tenant project)
                                                    "access.token.claim" "true"})
                                           (mapper "oidc-audience-mapper"
                                                   {"included.custom.audience" "mdb"
                                                    "access.token.claim" "true"})
                                           (mapper "oidc-audience-mapper"
                                                   {"included.custom.audience" "prometheus_write"
                                                    "access.token.claim" "true"})]))
        client (ClientManager/createClient session
                                           realm
                                           client-rep)]
    {:username (.getClientId client)
     :password (.getSecret client)}))

(defn delete [{:keys [resource-hash]}]
  (let [{:keys [session realm]} *authz-context*
        clients (->> (.getClientsStream realm)
                     to-seq
                     (filter #(-> % (.getAttribute hash-attribute) (= resource-hash)))
                     set)]
    (run! #(.removeClient (new ClientManager (new RealmManager session))
                          realm
                          %)
          clients)))

(defn rotate [ctx]
  (delete ctx)
  (create ctx))
