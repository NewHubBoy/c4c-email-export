#!/bin/sh
set -e

PORT=4000 node apps/api/dist/main.js &
API_PID=$!

npm run start --workspace apps/web &
WEB_PID=$!

trap 'kill "$API_PID" "$WEB_PID" 2>/dev/null' INT TERM

wait "$API_PID" "$WEB_PID"
