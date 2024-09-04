#!/bin/bash

set -eu -o pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

DEPLOYMENT="local-sensor-ingestion-mdb-frontend"

trap "telepresence leave $DEPLOYMENT-udh" EXIT
telepresence intercept -n udh $DEPLOYMENT --port 5173:80 && npm run dev
