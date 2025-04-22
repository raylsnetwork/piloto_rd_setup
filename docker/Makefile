.PHONY: help up-mongodb up-privacy-ledger deploy-privacy-ledger up-relayer up down destroy-rayls destroy-mongodb destroy-all

help:
	@echo "up-mongodb            - Start the mongodb service"
	@echo "up-privacy-ledger     - Start the privacy-ledger and mongodb services"
	@echo "deploy-privacy-ledger - Deploy the privacy-ledger contracts"
	@echo "up-relayer            - Start the relayer service, kmm, atomic and circom-api"
	@echo "up                    - Start all services"
	@echo "down                  - Stop all services and remove orphans"
	@echo "destroy-rayls         - Destroy the Rayls directory"
	@echo "destroy-all           - Destroy the Rayls and Mongodb directory"
	@echo "destroy-mongodb       - Destroy the Mongodb directory"

up-mongodb:
	@docker compose up -d mongodb
	@docker compose logs mongodb -f

up-privacy-ledger:
	@chmod +x ./init-privacy-ledger.sh && ./init-privacy-ledger.sh
	@docker compose up -d privacy-ledger

deploy-privacy-ledger:
	@docker compose up deploy-privacy-ledger

up-relayer:
	@chmod +x ./init-relayer.sh && ./init-relayer.sh
	@docker compose up -d kmm && sleep 10
	@docker compose up -d relayer
	@docker compose up -d atomic
	@docker compose up -d circom-api
	@docker compose logs relayer -f

up:
	@docker compose up -d

down:
	@docker compose down --remove-orphans --volumes

destroy-rayls:
	@echo "Você tem certeza que gostaria de remover esses arquivos? Se sim insira Y: \c"
	@read confirm && \
	case $$confirm in [yY] | [yY][eE][sS] ) ;; *) exit 1 ;; esac
	@sudo rm -rf ./rayls
	@echo "Rayls data removed"

destroy-mongodb:
	@echo "Você tem certeza que gostaria de remover esses arquivos? Se sim insira Y: \c"
	@read confirm && \
	case $$confirm in [yY] | [yY][eE][sS] ) ;; *) exit 1 ;; esac
	@sudo rm -rf ./mongodb
	@echo "Mongodb data removed"

destroy-all:
	@echo "Você tem certeza que gostaria de remover esses arquivos? Se sim insira Y: \c"
	@read confirm && \
	case $$confirm in [yY] | [yY][eE][sS] ) ;; *) exit 1 ;; esac
	@sudo rm -rf ./rayls ./mongodb ./.openzeppelin/*
	@echo "Rayls, Mongodb and openzeppelin data removed"
