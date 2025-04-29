#!/usr/bin/env bash

function deploy_privacy_ledger() {
    docker run -it --rm \
        --env-file .env \
        -v "$(pwd)/.openzeppelin:/app/.openzeppelin" \
        public.ecr.aws/rayls/rayls-contracts-privacy-ledger:v2.3.1
}

if [[ "$1" == "deploy_privacy_ledger" ]]; then
    deploy_privacy_ledger
    echo "Usage: $0 {deploy_privacy_ledger}"
    exit 1
fi