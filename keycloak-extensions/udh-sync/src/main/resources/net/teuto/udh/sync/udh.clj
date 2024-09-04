(ns net.teuto.udh.sync.udh
  (:refer-clojure :exclude [sync])
  (:require [cheshire.core :as json]
            [babashka.http-client :as http]
            [taoensso.timbre :refer [debug]])
  (:import [java.security MessageDigest]))

;; utils

(defn json-decode [s]
  (json/decode s true))

(defn to-seq [stream]
  (-> stream
      .iterator
      iterator-seq))

(def ^:dynamic *host* nil)
(def ^:dynamic *basic-auth* nil)
(def ^:dynamic *bearer* nil)
(defn http [path opts]
  (let [final-opts (merge {:uri (str "http://" *host* path)
                           :method :get
                           :return #(-> % :body json-decode)}
                          (when *basic-auth* {:basic-auth *basic-auth*})
                          (if *bearer*
                            (assoc-in opts
                                      [:headers "Authorization"]
                                      (str "Bearer " *bearer*))
                            opts))]
    (debug "HTTP request" ((juxt :method :uri :query-params) final-opts))
    ((:return final-opts)
     (http/request final-opts))))

(defn json-payload [j]
  {:body (json/encode j)
   :headers {:content-type "application/json"}})

(defn sync
  "Generic sync function that deletes, creates, then updates
   resources identified by unique IDs using the given functions."
  [{:keys [existing-fn identifier create-fn update-fn delete-fn resources]}]
  (let [id-fn (if (sequential? identifier)
                #(get-in % identifier)
                identifier)
        matches-id-from #(%2 (id-fn %1))
        desired-ids (->> resources (map id-fn) set)
        existing (existing-fn)
        existing-map (->> existing
                          (map (juxt id-fn identity))
                          (into {}))
        existing-ids (-> existing-map keys set)]
    (when delete-fn
      (->> existing
           (remove #(matches-id-from % desired-ids))
           (run! delete-fn)))
    (when create-fn (->> resources
                         (remove #(matches-id-from % existing-ids))
                         (run! create-fn)))
    (when update-fn (->> resources
                         (map #(when-let [id (matches-id-from % existing-ids)]
                                 [(existing-map id) %]))
                         (remove nil?)
                         (run! (partial apply update-fn))))))

(defn combine-into-hash [& strs]
  (let [sha256 (->> (.getBytes (apply str strs) "UTF-8")
                    (.digest (MessageDigest/getInstance "SHA-256"))
                    (map #(format "%02x" %))
                    (apply str))]
    (subs sha256 0 36)))

(defn random-name []
  (str (random-uuid)))