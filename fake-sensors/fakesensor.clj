(ns fakesensor
  "If you don't have a sensor, fake one."
  (:require [babashka.http-client :as http]
            [cheshire.core :as json]
            [clojure.java.shell :as shell]
            [clojure.string :as str])
  (:import [java.util Date]
           [java.text SimpleDateFormat]))

(defn token-url [realm] (str "https://login.udh-staging.teuto.net/realms/" realm "/protocol/openid-connect/token"))
(defn admin-url [realm path] (str "https://login.udh-staging.teuto.net/admin/realms/" realm path))
(def graphql-url "https://mdb.udh-staging.teuto.net/graphql")
(def receiver-url "https://api.udh-staging.teuto.net/api/v1/sensordata")
(def project "some-id")

(defn get-json [response]
  (-> response
      :body
      (json/decode true)))

(def admin-pw (delay
                (:out (shell/sh "sh" "-c"
                                "kubectl -n dev get secret udh-sso-keycloak -ojsonpath='{.data.admin-password}' | base64 -d"))))

(defn client-secret [client]
  (let [admin-user "user"
        token (-> (http/post (token-url "master")
                             {:form-params {:client_id "admin-cli"
                                            :grant_type "password"
                                            :username admin-user
                                            :password @admin-pw}})
                  get-json
                  :access_token)
        admin-request #(get-json
                        (http/get (admin-url "udh" %)
                                  {:headers {:authorization (str "Bearer " token)}}))]
    (->> (admin-request "/clients")
         (filter #(-> % :clientId (= client)))
         first
         :secret)))

(defn client-credentials-uncached [project]
  (let [client (str "lorawan-" project)]
    [client (client-secret client)]))
(def client-credentials (memoize client-credentials-uncached))

(defn get-token []
  (-> (http/post (token-url "udh")
                 {:form-params {:grant_type "client_credentials"}
                  :basic-auth (client-credentials project)})
      get-json
      :access_token))

(defn create-sensor []
  (let [id (random-uuid)
        metric-id (random-uuid)
        sensor {:project project,
                :thingId id,
                :deveui (str "devui" (.format (SimpleDateFormat. "yyyyMMdd't'HHmmss") (Date.))),
                :sensorId id,
                :labelId id,
                :metricId metric-id}
        result (get-json
                (http/post graphql-url
                           {:body (json/encode {:query (slurp "create-sensor.graphql")
                                                :variables sensor})
                            :headers {:authorization (str "Bearer " (get-token))
                                      :content-type "application/json"}}))]
    (some-> result :errors str Exception. throw)
    (doto sensor
      println)))

(defn fake-temperature []
  (-> (System/currentTimeMillis)
      (/ 20000)
      (Math/sin)
      (* 20)
      (+ 10)))

(defn write-values [{:keys [deveui]}]
  (let [payload {:end_device_ids {:device_id "example-devid"
                                  :application_ids {:application_id "example-appid"}
                                  :dev_eui deveui}
                 :received_at "2001-02-03T04:05:06.789Z"
                 :uplink_message {:rx_metadata [{}]
                                  :decoded_payload {"labelXYZ" deveui
                                                    "metricXYZ" (doto
                                                                 (fake-temperature)
                                                                  println)}}}]
    (http/post receiver-url
               {:body (json/encode payload)
                :basic-auth (client-credentials project)
                :headers {:content-type "application/json"}})))

(defn fake-sensor
  ([] (fake-sensor true))
  ([repeats]
   (let [sensor (create-sensor)]
     (loop [n 0]
       (write-values sensor)
       (when (or (true? repeats)
                 (> repeats n))
         (Thread/sleep 5000)
         (recur (inc n)))))))

(comment
  (fake-sensor 6)
  )

(when (#{(System/getProperty "babashka.file")} *file*)
  (fake-sensor))
