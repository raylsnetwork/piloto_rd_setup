.PHONY: help up up-rayls down-rayls down destroy-rayls destroy-all 

help:
	@echo "up            - Start all services"
	@echo "up-rayls      - Start and configure the Privacy Ledger and Relayer"
	@echo "down-rayls    - Stop the Privacy Ledger, Relayer and remove orphans"
	@echo "down          - Stop all services and remove orphans"
	@echo "destroy-rayls - Destroy the Rayls directory"
	@echo "destroy-all   - Destroy the Rayls directory, Mongodb directory and Docker Compose file"

up-rayls:
	@chmod +x ./init.sh && ./init.sh $(CHAINID) $(MONGODB_CONNECTION_STRING) ${COMMIT_CHAIN_RPC_URL} ${COMMIT_CHAIN_WS_URL}

down-rayls:
	@docker compose down privacy-ledger relayer --remove-orphans

up:
	@docker compose up -d

down:
	@docker compose down --remove-orphans

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
	@sudo rm -rf ./rayls ./mongodb ./docker-compose.yml
	@echo "Rayls data, Mongodb data and Docker Compose file removed"