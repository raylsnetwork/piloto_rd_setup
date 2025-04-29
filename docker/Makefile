.PHONY: help mongodb create-private-key privacy-ledger create-relayer-secrets relayer down-all destroy-all

help:
	@echo "Usage: make <target> [action]"
	@echo "Targets:"
	@echo "mongodb                 - (Optional) - Manage the MongoDB service (use 'up' to start or 'down' to stop)"
	@echo "create-private-key      - Generate a private key for the Rayls service"
	@echo "privacy-ledger          - Manage the Privacy Ledger service (use 'up' to start or 'down' to stop)"
	@echo "create-relayer-secrets  - Generate secrets for the relayer service"
	@echo "relayer                 - Manage the Relayer service along with KMM, Atomic, and Circom-API (use 'up' to start or 'down' to stop)"
	@echo "down-all                - Stop all running services and remove associated volumes"
	@echo "destroy-all             - Permanently delete the Rayls, MongoDB, and OpenZeppelin data (requires confirmation)"

mongodb:
	@if [ "$(filter up down,$(word 2,$(MAKECMDGOALS)))" ]; then \
		action=$(word 2,$(MAKECMDGOALS)); \
		if [ "$$action" = "up" ]; then \
			docker compose up -d mongodb; \
			docker compose logs mongodb -f; \
		elif [ "$$action" = "down" ]; then \
			docker compose down mongodb -v; \
		fi; \
	else \
		echo "Invalid action. Use 'make mongodb up' or 'make mongodb down'"; \
	fi; \
	exit 0;

create-private-key:
	@./scripts/generate_keys.sh private_key

privacy-ledger:
	@if [ "$(filter up down,$(word 2,$(MAKECMDGOALS)))" ]; then \
		action=$(word 2,$(MAKECMDGOALS)); \
		if [ "$$action" = "up" ]; then \
			chmod +x ./scripts/init-privacy-ledger.sh && ./scripts/init-privacy-ledger.sh; \
			docker compose up -d privacy-ledger && sleep 10; \
			docker compose up deploy-privacy-ledger; \
		elif [ "$$action" = "down" ]; then \
			docker compose down privacy-ledger -v; \
		fi; \
	else \
		echo "Invalid action. Use 'make privacy-ledger up' or 'make privacy-ledger down'"; \
	fi; \
	exit 0;

create-relayer-secrets:
	@./scripts/generate_keys.sh relayer_secrets

relayer:
	@if [ "$(filter up down,$(word 2,$(MAKECMDGOALS)))" ]; then \
		action=$(word 2,$(MAKECMDGOALS)); \
		if [ "$$action" = "up" ]; then \
			chmod +x ./scripts/init-relayer.sh && ./scripts/init-relayer.sh; \
			docker compose up -d kmm && sleep 10; \
			docker compose up -d relayer atomic circom-api; \
			docker compose logs relayer -f; \
		elif [ "$$action" = "down" ]; then \
			docker compose down relayer atomic circom-api kmm -v; \
		fi; \
	else \
		echo "Invalid action. Use 'make relayer up' or 'make relayer down'"; \
	fi; \
	exit 0;

down-all:
	@docker compose down -v --remove-orphans

destroy-all:
	@echo "Você tem certeza que gostaria de remover esses arquivos? Se sim insira Y: \c"
	@read confirm && \
	case $$confirm in [yY] | [yY][eE][sS] ) ;; *) exit 1 ;; esac
	@sudo rm -rf ./rayls ./mongodb ./.openzeppelin/*
	@echo "Rayls, Mongodb data and openzeppelin removed"
