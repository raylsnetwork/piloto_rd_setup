.PHONY: help create-private-key deploy-privacy-ledger create-relayer-secrets

help:
	@echo "Usage: make <target>"
	@echo "Targets:"
	@echo "create-private-key      - Generate a private key for the Rayls service"
	@echo "deploy-privacy-ledger   - Deploy the Privacy Ledger contracts"
	@echo "create-relayer-secrets  - Generate secrets for the relayer service"

create-private-key:
	@./scripts/generate_keys.sh private_key

deploy-privacy-ledger:
	@./scripts/deploy.sh deploy_privacy_ledger

create-relayer-secrets:
	@./scripts/generate_keys.sh relayer_secrets
