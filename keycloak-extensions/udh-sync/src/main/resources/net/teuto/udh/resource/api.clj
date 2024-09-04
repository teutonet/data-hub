(ns net.teuto.udh.resource.api
  (:require [net.teuto.udh.resource.event.grafana :as grafana]
            [net.teuto.udh.resource.group :as group]
            [net.teuto.udh.resource.sensor-credential :as sensor-credential]
            [net.teuto.udh.resource.tenant :as tenant]
            [net.teuto.udh.resource.event.bucket :as bucket]))

(def api
  {:resources
   {:tenant
    {:manual-naming true
     :hook {:create #'tenant/create
            :delete #'tenant/delete}
     :resources
     {:project
      {:manual-naming true
       :scopes #{:prometheus-read :prometheus-write
                 :bucket-write
                 :sensor-metadata-write}
       :resources
       {:sensor-credential
        {:manual-naming true
         :scopes #{:rotate}
         :hook {:create #'sensor-credential/create
                :delete #'sensor-credential/delete}
         :action {:rotate #'sensor-credential/rotate}}}}
      :group
      {:manual-naming true
       :scopes #{:dashboard-edit}
       :hook {:create #'group/create
              :delete #'group/delete}}}}}})

(def event-handlers [#'grafana/event
                     #'bucket/event])