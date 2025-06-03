#!/usr/bin/env bash

function deploy_privacy_ledger() {
    docker run -it --rm \
        --env-file .env \
        -v "$(pwd)/.openzeppelin:/app/.openzeppelin" \
        --entrypoint /bin/sh \
        public.ecr.aws/rayls/rayls-contracts:v2.4.0 \
        -c "npx hardhat deploy:privacy-ledger --private-ledger CUSTOM  --network custom_pl"
}

if [[ "$1" == "deploy_privacy_ledger" ]]; then
    deploy_privacy_ledger
    echo "Usage: $0 {deploy_privacy_ledger}"
    exit 1
fi