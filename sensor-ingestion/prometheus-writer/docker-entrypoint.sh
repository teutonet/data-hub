#!/bin/sh

set -e

. .venv/bin/activate

exec python3 -m prometheus_remote_write
