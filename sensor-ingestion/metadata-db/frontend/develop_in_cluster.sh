#!/bin/bash

set -eu -o pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

DEPLOYMENT="local-udh-platform-mdb-frontend"

trap "telepresence leave $DEPLOYMENT" EXIT
telepresence connect -n udh
telepresence intercept $DEPLOYMENT --port 5173:80 && npm run dev
