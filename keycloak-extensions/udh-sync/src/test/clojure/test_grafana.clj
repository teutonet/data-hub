(ns test-grafana
  (:require [clojure.string :as str]
            [clojure.test :as t :refer [deftest is]]
            [net.teuto.udh.sync.grafana :as g]))

(deftest orgs
  (let [orgname (str (random-uuid))
        org-exists #(-> (map :name (g/existing-orgs))
                        set
                        (contains? orgname))]
    (is (not (org-exists)))
    (g/sync-org-presence #{g/public-org-name orgname})
    (is (org-exists))
    (g/sync-org-presence #{g/public-org-name orgname})
    (is (org-exists))
    (g/sync-org-presence #{g/public-org-name})
    (is (not (org-exists)))))

(deftest mappings
  (is (= {"public" #{}, "a" #{"a1" "a2"}, "b" #{}}
         (g/parse-mappings ["a=a1,a2" "b="]))))

(deftest datasource
  (let [orgname (str (random-uuid))
        org (g/create-org orgname)
        two-projects #{"a" "123"}
        no-projects #{}]
    (g/set-current-org org)
    (doseq [desired-projects [two-projects
                              no-projects]]
      (g/sync-datasources {g/public-org-name no-projects
                           orgname desired-projects})
      (is (= desired-projects
             (->> (g/existing-datasources)
                  (map :jsonData)
                  (map :httpHeaderValue1)
                  (map #(str/split % #"\|"))
                  flatten
                  (remove str/blank?)
                  set))))))

(deftest user
  (let [orgname (str (random-uuid))
        org (g/create-org orgname)
        username (str (random-uuid))
        email (str username "@example.com")
        user-exists #(g/lookup-user username)
        user-orgs #(->> username
                        g/lookup-user
                        g/current-user-orgs
                        (map :name)
                        (remove #{g/public-org-name})
                        set)]
    (is (not (user-exists)))

    (g/sync-user username email #{orgname} true)
    (is (not (user-exists)))

    (g/sync-user username email #{orgname} false)
    (is (user-exists))
    (is (= #{orgname} (user-orgs)))

    (g/set-current-org org (g/lookup-user username))

    (g/sync-user username email #{} true)
    (is (= #{} (user-orgs)))

    (g/delete-user {:login username})
    (is (not (user-exists)))
    (g/delete-user {:login username})
    (is (not (user-exists)))))

(defn run-tests []
  (let [{:keys [fail error]} (t/run-tests 'test-grafana)]
    (when (pos? (+ fail error))
      (System/exit 1))))    
