#!/bin/sh

set -e

. .venv/bin/activate

exec python3 sync.py
