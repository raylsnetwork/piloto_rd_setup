.PHONY: help init destroy-rayls destroy-mongodb destroy-compose destroy-all up-mongodb up-privacy-ledger up-relayer down-privacy-ledger down-relayer down-rayls down-all

help:
	@echo "init                - Initialize the participant. Example: make init CHAINID=xxxxxxxxxx MONGODB_CONNECTION_STRING='mongodb+srv://username:password@endpoint'"
	@echo "destroy-rayls       - Destroy the Rayls directory"
	@echo "destroy-mongodb     - Destroy the Mongodb directory"
	@echo "destroy-compose     - Destroy Docker Compose file"
	@echo "destroy-all         - Destroy the Rayls directory, Mongodb directory and Docker Compose file"
	@echo "up-mongodb          - Start the MongoDB Cluster"
	@echo "down-mongodb        - Stop the MongoDB Cluster and remove orphans"
	@echo "up-privacy-ledger   - Start the Privacy ledger"
	@echo "up-relayer          - Start the Relayer"
	@echo "down-privacy-ledger - Stop the Privacy ledger"
	@echo "down-relayer        - Stop the Relayer"
	@echo "down-rayls          - Stop the Privacy Ledger, Relayer and remove orphans"
	@echo "down-all"           - Stop all services and remove orphans

init:
	@chmod +x ./scripts/init.sh && ./scripts/init.sh $(CHAINID) $(MONGODB_CONNECTION_STRING)

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
	@sudo rm -rf ./mongodb/data
	@echo "Mongodb data removed"

destroy-compose:
	@echo "Você tem certeza que gostaria de remover esses arquivos? Se sim insira Y: \c"
	@read confirm && \
	case $$confirm in [yY] | [yY][eE][sS] ) ;; *) exit 1 ;; esac
	@sudo rm -rf ./docker-compose.yml
	@echo "Docker Compose file removed

destroy-all:
	@echo "Você tem certeza que gostaria de remover esses arquivos? Se sim insira Y: \c"
	@read confirm && \
	case $$confirm in [yY] | [yY][eE][sS] ) ;; *) exit 1 ;; esac
	@sudo rm -rf ./rayls ./mongodb/data ./docker-compose.yml
	@echo "Rayls data, Mongodb data and Docker Compose file removed"

up-mongodb:
	@test -d ./mongodb/data || mkdir -p ./mongodb/data 
	@docker compose -f docker-compose.mongodb.yml up -d mongodb
	@docker logs docker-mongodb-1 -f

down-mongodb:
	@docker compose -f docker-compose.mongodb.yml down mongodb --remove-orphans

up-privacy-ledger:
	@docker compose up -d privacy-ledger
	@docker logs docker-privacy-ledger-1 -f

up-relayer:
	@docker compose up -d relayer
	@docker logs docker-relayer-1 -f

down-privacy-ledger:
	@docker compose down privacy-ledger

down-relayer:
	@docker compose down relayer

down-rayls:
	@docker compose down privacy-ledger relayer --remove-orphans

down-all:
	@docker compose down --remove-orphans
