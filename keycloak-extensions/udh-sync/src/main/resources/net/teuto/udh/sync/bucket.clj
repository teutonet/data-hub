(ns net.teuto.udh.sync.bucket
  "Synchronization code for S3 compatible bucket reconciliation including users.")

;; claims

(defn session-tags [projects]
  [{"principal_tags" {"bucket" projects}}])
