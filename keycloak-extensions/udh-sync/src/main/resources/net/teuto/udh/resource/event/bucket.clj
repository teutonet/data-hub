(ns net.teuto.udh.resource.event.bucket
  (:require [cheshire.core :as json]
            [cognitect.aws.client.api :as aws]
            [taoensso.timbre :refer [info]])
  (:import [jakarta.ws.rs ServerErrorException]))

(def bucket-endpoint (System/getenv "BUCKET_ENDPOINT"))

(def s3 (aws/client {:api :s3
                     :region "us-east-1"
                     :endpoint-override {:hostname bucket-endpoint}}))

(defn s3-api
  "Invoke S3 API and turn responses into exceptions if there is an anomaly."
  [op-map]
  (let [response (aws/invoke s3 op-map)]
    (when (:cognitect.anomalies/category response)
      (throw (new ServerErrorException
                  500
                  (:cognitect.aws.util/throwable response))))
    response))

(defn bucket-name [tenant project]
  ; TODO for long tenant AND project names we'd need to resort to a hash with a reasonable prefix
  ; That will only be necessary for names that currently lead to errors, no migration will be necessary.
  (str tenant "." project))

(defn bucket-policy [n]
  {:Version "2012-10-17"
   :Statement
   [{:Action ["s3:ListBucket"
              "s3:GetObject"
              "s3:PutObject"
              "s3:DeleteObject"]
     :Effect "Allow"
     :Resource ["arn:aws:s3:::*" "arn:aws:s3:::*/*"]
     :Principal {:AWS ["arn:aws:sts:::assumed-role/usercode/usercode"]}
     :Condition {:StringEquals {:aws:PrincipalTag/bucket n}}}]})

(defn set-policy [bucket]
  (s3-api {:op :PutBucketPolicy
           :request {:Bucket bucket
                     :Policy (json/encode (bucket-policy bucket))}}))

(defn create-bucket [tenant project]
  #(let [bucket (bucket-name tenant project)]
     (info "Creating bucket " bucket)
     (s3-api {:op :CreateBucket
              :request {:Bucket bucket}})
     (set-policy bucket)))

(defn delete-bucket [tenant project]
  #(let [bucket (bucket-name tenant project)]
     (info "Deleting bucket " bucket)
     (s3-api {:op :DeleteBucket
              :request {:Bucket bucket}})))

(defn event [{:keys [event-type
                     resource-type
                     resource-name]
              {:keys [tenant]} :names}]
  (when bucket-endpoint
    (cond
      (and (= :create event-type)
           (= :project resource-type))
      (create-bucket tenant resource-name)

      (and (= :delete event-type)
           (= :project resource-type))
      #(delete-bucket tenant resource-name))))

