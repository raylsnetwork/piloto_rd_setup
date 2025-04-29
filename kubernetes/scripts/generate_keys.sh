#!/bin/bash

function private_key() {
  local key
  key=$(openssl rand -hex 32 | awk '{print "0x"$0}')
  echo "$key"
}

function relayer_secrets() {
  api_key=$(openssl rand -hex 16)
  
  api_secret=$(openssl rand -hex 32)

  echo "BLOCKCHAIN_KMS_API_KEY: \"$api_key\""
  echo "BLOCKCHAIN_KMS_SECRET: \"$api_secret\""
  echo "KMS_API_KEY: \"$api_key\""
  echo "KMS_SECRET: \"$api_secret\""
}

if [[ "$1" == "private_key" ]]; then
  private_key
elif [[ "$1" == "relayer_secrets" ]]; then
  relayer_secrets
else
  echo "Usage: $0 {private_key|relayer_secrets}"
  exit 1
fi