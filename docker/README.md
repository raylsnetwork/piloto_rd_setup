# Docker

## Pré-requisitos

- WSL/Sistema operacional Linux
- [Make](https://www.gnu.org/software/make/)
- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Docker](https://docs.docker.com/engine/install/ubuntu/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Criando .env

Todo o setup via Docker compose está utilizando `.env`. Existe um `.env-example` disponível para todo o processo de instalação. Crie um arquivo `.env` baseado no `.env-example`

```bash
# The following environment variables are used to configure the Rayls application.
# Please replace the placeholder values with your actual configuration.

# Deploy Contracts
NODE_CC_CHAIN_ID="999990001"
RPC_URL_NODE_CC="http://<besu-endpoint>:8545"
WS_URL_NODE_CC="ws://<besu-endpoint>:8546"
PRIVATE_KEY_SYSTEM="0x0000000000000000000000000000000000000000"
RPC_URL_NODE_PL="http://privacy-ledger:8545"
NODE_PL_CHAIN_ID="123456789"
COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY="0x9bfe7a23fC8882D7A692d959C89c0c2A7266bfED"

# Relayer variables
BLOCKCHAIN_DATABASE_NAME=rayls-relayer
BLOCKCHAIN_PLSTARTINGBLOCK=100
BLOCKCHAIN_EXECUTOR_BATCH_MESSAGES=500
BLOCKCHAIN_PLENDPOINTADDRESS=0x1234567890abcdef1234567890abcdef12345678
BLOCKCHAIN_LISTENER_BATCH_BLOCKS=50
BLOCKCHAIN_STORAGE_PROOF_BATCH_MESSAGES=200
BLOCKCHAIN_ENYGMA_PL_EVENTS=0x1234567890abcdef1234567890abcdef12345678
COMMITCHAIN_CCSTARTINGBLOCK=123456
COMMITCHAIN_ATOMICREVERTSTARTINGBLOCK=123456
KMS_DATABASE_NAME=rayls-kmm
BLOCKCHAIN_KMS_API_KEY="example_api_key"
BLOCKCHAIN_KMS_SECRET="example_secret"
KMS_API_KEY="example_api_key"
KMS_SECRET="example_secret"
```

## Instalando o ambiente Rayls

### MongoDB
> **⚠️ Atenção:**
> Tanto a Rayls Privacy Ledger quanto o Rayls Relayer necessitam de um cluster MongoDB com Replica Set configurado. Caso nenhuma connection string seja informada, inicializaremos um cluster MongoDB local com Replica Set configurado.
>
> Reforçamos que essa imagem estará disponível no repositório somente enquanto durarem os testes do Drex e que não deve ser utilizada em produção. A Parfin não se responsabiliza pelo suporte no Mongo ou caso ocorra alguma perda de dados relacionada a essa imagem.

#### Importante

- O container do mongo persistirá os dados no diretório ./mongodb/data
- Para remover os dados basta executar o comando sudo rm -rf ./mongodb/data
- É essencial que o MongoDB esteja operacional para inicializar a Rayls Network
- Caso tenha perdido esse par de chaves, por favor entre em contato com o time da Parfin

Para inicializar o MongoDB basta executar o comando:

```bash
make up-mongodb
```

### Privacy Ledger

1. Inicie a aplicação utilizando o comando:

```bash
make up-privacy-ledger
```

- Output:
```bash
Directories created:
./rayls/privacy-ledger/var
./rayls/relayer/var

Files created:
./rayls/privacy-ledger/var/genesis.json
./rayls/privacy-ledger/var/start.sh

NODE_PL_CHAIN_ID was updated in the following files:
./rayls/privacy-ledger/var/genesis.json
./rayls/privacy-ledger/var/start.sh

Starting Privacy Ledger...
[+] Running 1/1
 ✔ Container docker-privacy-ledger-1  Started  
```

2. Após iniciar a Privacy Ledger será necessário realizar o deploy dos contratos, execute o comando:

```bash
make deploy-privacy-ledger
```

Output:
```bash
Starting deployment of Private Ledger base contracts...
Deployer Address: 0x0000000000000000000000000000000000000000
###########################################
🛠️ DEPLOYMENT_REGISTRY_ADDRESS_PL not found in .env file. Deploying a new DeploymentRegistry contract...
Deploying DeploymentRegistry...
✅ DeploymentRegistry deployed at 0x0000000000000000000000000000000000000000
Deploying RaylsMessageExecutorV1...
✅ RaylsMessageExecutorV1 deployed at 0x0000000000000000000000000000000000000000
Deploying EndpointV1...
✅ EndpointV1 deployed at 0x0000000000000000000000000000000000000000
Deploying RaylsContractFactoryV1...
✅ RaylsContractFactoryV1 deployed at 0x0000000000000000000000000000000000000000
Deploying ParticipantStorageReplicaV1...
✅ ParticipantStorageReplicaV2 deployed at 0x0000000000000000000000000000000000000000
Deploying TokenRegistryReplicaV1...
✅ TokenRegistryReplicaV1 deployed at 0x0000000000000000000000000000000000000000
Deploying EnygmaPLEvent...
✅ EnygmaPLEvent deployed at0x0000000000000000000000000000000000000000
✅ Finished deployment of PL base contracts
===========================================
👉 Contract Addresses 👈
RAYLS_MESSAGE_EXECUTOR: 0x0000000000000000000000000000000000000000
PL_ENDPOINT: 0x0000000000000000000000000000000000000000
RAYLS_CONTRACT_FACTORY: 0x0000000000000000000000000000000000000000
PARTICIPANT_STORAGE_REPLICA: 0x0000000000000000000000000000000000000000
ENYGMA_PL_EVENTS:0x0000000000000000000000000000000000000000
-------------------------------------------
Configuring contracts in EndpointV1...
✅ Contracts configured successfully in EndpointV1.
Synchronizing participant data from Commit Chain...
✅ Participant data synchronization complete.
Synchronizing frozen tokens from Commit Chain...
✅ Frozen tokens synchronization complete.
Registering Token Registry in EndpointV1...
✅ Token Registry registered successfully.
Saving deployment data for version: 2.0
⏳ Waiting for transaction to be mined...
✅ Deployment data saved on blockchain!
✅ Deployment data saved for version 2.0

NODE_PL_ENDPOINT_ADDRESS0x0000000000000000000000000000000000000000

===========================================
👉👉👉👉 Relayer Configuration 👈👈👈👈
-------------------------------------------
ENV FORMAT:

BLOCKCHAIN_PLSTARTINGBLOCK=00
BLOCKCHAIN_EXECUTOR_BATCH_MESSAGES=500
BLOCKCHAIN_PLENDPOINTADDRESS=0x00000000000000000000000000000000000000003
BLOCKCHAIN_LISTENER_BATCH_BLOCKS=50
BLOCKCHAIN_STORAGE_PROOF_BATCH_MESSAGES=200
BLOCKCHAIN_ENYGMA_PL_EVENTS=0x0000000000000000000000000000000000000000
```

> ℹ️ O arquivo `unknown-<NODE_PL_CHAIN_ID>.json` será adicionado automaticamente na pasta `.openzeppelin`. É importante que esse arquivo seja versionado ao final do processo.


### Relayer, KMM, Atomic Service e Circom API

Após realizar o deploy da Governance API e Privacy Ledger será possível inicializar os demais componentes.

1. Crie as chaves `API_KEY` e `API_SECRET`:
```bash
api_key=$(openssl rand -hex 16)
 
api_secret=$(openssl rand -hex 32)
 
echo "API_KEY=$api_key"
echo "API_SECRET=$api_secret"
```

2. Atualize as variáveis na sessão `# Relayer variables`
```bash
# Relayer variables
BLOCKCHAIN_DATABASE_NAME=rayls-relayer
BLOCKCHAIN_PLSTARTINGBLOCK=100
BLOCKCHAIN_EXECUTOR_BATCH_MESSAGES=500
BLOCKCHAIN_PLENDPOINTADDRESS=0x1234567890abcdef1234567890abcdef12345678
BLOCKCHAIN_LISTENER_BATCH_BLOCKS=50
BLOCKCHAIN_STORAGE_PROOF_BATCH_MESSAGES=200
BLOCKCHAIN_ENYGMA_PL_EVENTS=0x1234567890abcdef1234567890abcdef12345678
COMMITCHAIN_CCSTARTINGBLOCK=123456 # Gerado no Deploy dos Contratos da Commit Chain
COMMITCHAIN_ATOMICREVERTSTARTINGBLOCK=123456 # Gerado no Deploy dos Contratos da Commit Chain
KMS_DATABASE_NAME=rayls-kmm
BLOCKCHAIN_KMS_API_KEY="API_KEY"
BLOCKCHAIN_KMS_SECRET="API_SECRET"
KMS_API_KEY="API_KEY"
KMS_SECRET="API_SECRET"
```

2. Inicialize os componentes:
```bash
make up-relayer
```

- Output
```bash
relayer-1  | [21:11:50 2025-04-15] INFO: Configuration validated successfully | 
relayer-1  | [21:11:50 2025-04-15] INFO: Initializing.. | CCEndpointMaxBatchMessages=500 
relayer-1  | Working dir path:  /app
relayer-1  | Migrations path:  file:///app/database/mongodb/migrations
relayer-1  | [21:11:50 2025-04-15] INFO: No migration files found. Skipping migration. | 
relayer-1  | [21:11:52 2025-04-15] INFO: Getting DH pair | 
relayer-1  | [21:11:52 2025-04-15] WARN: DH pair not found |  
relayer-1  | [21:11:52 2025-04-15] INFO: Creating DH pair |  
relayer-1  | [21:11:52 2025-04-15] INFO: Successfully created and retrieved DH pair | 
relayer-1  | [21:11:52 2025-04-15] INFO: Retrieving enygma key | 
relayer-1  | [21:11:52 2025-04-15] WARN: Enygma key not found | 
relayer-1  | [21:11:52 2025-04-15] INFO: Creating enygma key | 
relayer-1  | [21:11:52 2025-04-15] INFO: Successfully created enygma key | 
relayer-1  | [21:11:52 2025-04-15] INFO: Retrieving relayer ECDSA keys | 
relayer-1  | [21:11:52 2025-04-15] WARN: Relayer ECDSA keys not found | 
relayer-1  | [21:11:52 2025-04-15] INFO: Creating relayer ECDSA keys | 
relayer-1  | [21:11:52 2025-04-15] INFO: Successfully created relayer ECDSA keys | 
relayer-1  | [21:11:52 2025-04-15] INFO: Initialising private Ledger starting block number | StartingBlock=00 
relayer-1  | [21:11:52 2025-04-15] INFO: Initialising Commit Chain starting block from config | StartingBlock=123456
relayer-1  | [21:11:53 2025-04-15] INFO: Private keys for PL and CC populated successfully | 
relayer-1  | [21:11:53 2025-04-15] INFO: DH public key already registered | ChainId=123456789
relayer-1  | [21:11:54 2025-04-15] INFO: BabyJubjub X & Y keys already registered | ChainId=123456789
relayer-1  | [21:11:54 2025-04-15] INFO: Chain ID already registered | ChainId=123456789 
relayer-1  | [21:11:54 2025-04-15] INFO: Audit info already registered | ChainId=123456789 
relayer-1  | [21:11:56 2025-04-15] INFO: Adding logs to CC batcher | Batch length:=2 
relayer-1  | [21:11:57 2025-04-15] INFO: Total messages to finishEIP5164Transaction | Total Messages=0 
relayer-1  | [21:11:57 2025-04-15] INFO: Total messages to execute on PL from CC | Total Messages=2 
relayer-1  | [21:11:57 2025-04-15] INFO: Messages for the PL from the CC executed | Total Executed Messages:=2 
```

Para encerrar os logs do Relayer basta executar o comando `ctrl+c`

### FAQ

#### Comandos para verificar os pré requisitos e as versões instaladas

- Linux: `uname -a`
- git: `git --version` 
- make: `make --version`
- docker: `docker --version`
- docker compose: `docker compose version` 

#### Como verifico os comandos disponíveis neste projeto?

Para verificar os comandos disponíveis basta rodar o comando `make help`

```bash
up-mongodb            - Start the mongodb service
up-privacy-ledger     - Start the privacy-ledger and mongodb services
deploy-privacy-ledger - Deploy the privacy-ledger contracts
up-relayer            - Start the relayer service, kmm, atomic and circom-api
up                    - Start all services
down                  - Stop all services and remove orphans
destroy-rayls         - Destroy the Rayls directory
destroy-all           - Destroy the Rayls and Mongodb directory
destroy-mongodb       - Destroy the Mongodb directory
```

#### Como verifico se meus containers estão rodando?

```bash
docker ps
```

#### Como verifico os logs dos containers?

Para visualizar os logs dos containers basta executar os seguintes comandos:

```bash
docker logs docker-mongodb-1 -f
docker logs docker-privacy-ledger-1 -f
docker logs docker-relayer-1 -f
docker logs docker-circom-api-1 -f
docker logs docker-kmm-1 -f
docker logs docker-atomic-service-1 -f
```

#### Como realizo o restore das chaves em outra instalação?

Caso tenha necessidade de realizar a instalação do setup em outra instância EC2 ou VM, é importante realizar os seguintes passos:

- Realizar o backup das chaves atuais: 
```bash
docker exec -it docker-mongodb-1 bash
mongosh
use rayls-relayer
db.secrets.find()
```
- Adicionar os valores da `DHSECRET`, `DHPUBLIC` e `PRIVATEKEY` nas variáveis no `.env` previamente criado:

```bash
BLOCKCHAIN_DHSECRET=$DHSECRET
BLOCKCHAIN_DHPUBLIC=$DHPUBLIC
BLOCKCHAIN_PRIVATEKEY=$PRIVATEKEY
```

- Atualizar a estrutura do arquivo de configuração do relayer para incluir as novas chaves:

./rayls/relayer/var/.env
```bash
BLOCKCHAIN_DHSECRET=$DHSECRET
BLOCKCHAIN_DHPUBLIC=$DHPUBLIC
BLOCKCHAIN_PRIVATEKEY=$PRIVATEKEY
```
