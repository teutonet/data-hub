(ns net.teuto.udh.sync.repl
  (:require [taoensso.timbre :refer [info] :as timbre]
            [nrepl.server :as nrepl-server]
            [cider.nrepl :refer (cider-nrepl-handler)]))

#_{:clj-kondo/ignore [:clojure-lsp/unused-public-var]}
(defn start-repl []
  (timbre/set-level! :info)
  (let [port 7888]
    (nrepl-server/start-server :port port
                               :handler cider-nrepl-handler)
    (info "Started REPL on port" port)))