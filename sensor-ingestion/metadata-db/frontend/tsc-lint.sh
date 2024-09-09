#!/bin/bash -e
# used for lint-staged, see: https://stackoverflow.com/a/60950355

TMP=.tsconfig-lint.json
function tearDown {
  rm -f $TMP
}
trap tearDown EXIT
cat >$TMP <<EOF
{
  "extends": "./tsconfig.json",
  "include": [
EOF
for file in "$@"; do
  echo "    \"$file\"," >> $TMP
done
cat >>$TMP <<EOF
    "unused"
  ]
}
EOF
tsc --project $TMP --skipLibCheck --noEmit