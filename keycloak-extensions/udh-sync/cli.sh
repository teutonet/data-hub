#!/bin/bash

# Docker wrapper for udh-sync

set -eu -o pipefail

target=${1---help}
shift

case $target in
	grafana)
		# fallback to password from secret
		: "${GRAFANA_PASSWORD=$(kubectl -n dev get secret udh-grafana -ojsonpath='{.data.admin-password}' | base64 -d)}"
		export GRAFANA_PASSWORD
		;;
	chirpstack)
		# fallback to password from secret
		: "${CHIRPSTACK_API_KEY=$(kubectl -n dev get secret udh-chirpstack-api -ojsonpath='{.data.key}' | base64 -d)}"
		export CHIRPSTACK_API_KEY
		;;
	*)
		echo "First argument is grafana or chirpstack!"
		exit 1
		;;
esac

exec \
	docker run \
	$([[ -t 0 ]] && echo --tty) --interactive \
	--rm \
	--network=host \
	$(printf -- "-e ${target^^}_%s " HOST USER PASSWORD API_KEY) \
	babashka/babashka \
	bb \
	${DEBUG+--debug} \
	"$(cat "$(dirname "$0")/src/main/resources/net/teuto/udh/sync/"{udh,$target}".clj")" \
	"$@"
