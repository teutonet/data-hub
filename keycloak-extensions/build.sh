#!/bin/bash

set -eu -o pipefail

mkdir /target

for i in /project/*/.
do
	cd $i
	mvn package
	cp target/*.jar /target/$(basename $PWD).jar

	kc_version=$(mvn help:evaluate -Dexpression=keycloak.version -q -DforceStdout)
	if [[ "$kc_version" =~ ^[0-9.]+$ ]]
	then
		cat <<<"$kc_version" > /keycloak-version
	fi
done
