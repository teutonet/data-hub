#!/bin/bash

set -eu -o pipefail

exec "$(dirname "$0")/common/release.sh" "${1-}" \
	charts/sensor-ingestion/{Chart,values}.yaml \
	metadata-db/*/package.json \
	prometheus-writer/app/write.yaml \
	lorawan-receiver/app/lorawanReceiver.yaml
