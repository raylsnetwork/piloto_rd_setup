#!/bin/bash
PROJECT_DIR="$(dirname "$(dirname "$(readlink -fm "$0")")")"

cd "$PROJECT_DIR" || exit 1

node -r @swc-node/register ./hardhat/cli/cli/ledger.ts "$@"
