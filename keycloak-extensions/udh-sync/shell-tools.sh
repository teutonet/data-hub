# source this with `source shell-tools.sh`

token () {
	local user=${1-admin}
	curl -sSf http://localhost:8080/realms/master/protocol/openid-connect/token -d client_id=data-hub -d client_secret=secret -d grant_type=password -d password=$user -d username=$user \
	| jq .access_token -r
}

# use as `api /tenants` or `DH_USER=someusername api /tenants/abc/projects/mynewproject -X PUT`
api () {
	local p=$1
	shift
	curl -sSf --oauth2-bearer "`token ${DH_USER-admin}`" "localhost:8080/realms/master/data-hub$p" "$@"
}
