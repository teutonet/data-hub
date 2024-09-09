#!/usr/bin/env bash

source "$(dirname "$BASH_SOURCE")/.common"

cd "$TEST_ENV"

./minikube-startup
./build-image
./helm-upgrade
./set-etc-hosts
