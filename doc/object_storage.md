# Object Storage

(S3 compatible) object storage is currently provided by Ceph.

In order to save the complexity of managing stateful users on the Ceph side and keeping their permissions for various buckets up to date,
users log in through Keycloak / [sts:AssumeRoleWithWebIdentity](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRoleWithWebIdentity.html).
The allowed buckets are set through session tags and checked through bucket policies.

relevant Ceph docs

- https://docs.ceph.com/en/reef/radosgw/keycloak/
- https://docs.ceph.com/en/reef/radosgw/STS/
- https://docs.ceph.com/en/reef/radosgw/session-tags/

## Debugging

When debugging RadowGW / S3 failures it might be helpful to run

```
alias c='kubectl exec -it deploy/rook-ceph-tools -- ceph'
c config set global debug_rgw 20/5
```

to turn up logging and watch `deploy/rook-ceph-rgw-bucket-a`.

Disable with

```
c config rm global debug_rgw
```

`awscli` is also helpful

```
alias aws='aws --endpoint-url https://storage.XXXXXXXXXXXXXXX.teuto-data-hub.dev.teuto.dev'
export AWS_ACCESS_KEY_ID=XXXXXXXXXXXXXXXXXXXX
export AWS_SECRET_ACCESS_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

aws s3api get-bucket-policy help
aws s3api get-bucket-policy --bucket XXXXXXX
```
