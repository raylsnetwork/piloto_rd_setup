# Docker

## Pré-requisitos

- WSL/Sistema operacional Linux
- [Make](https://www.gnu.org/software/make/)
- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Docker](https://docs.docker.com/engine/install/ubuntu/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Criando o arquivo `.env`

Todo o setup via Docker Compose utiliza o arquivo `.env`. Existe um `.env-example` disponível para o processo de instalação. Crie um arquivo `.env` baseado no `.env-example`.

```bash
cp .env-example .env
```

> ℹ️ Existem alguns targets no Makefile para facilitar o processo de instalação. Para verificar os comandos disponíveis, basta executar o comando `make help`.

```bash
Usage: make <target> [action]
Targets:
mongodb                 - (Optional) - Manage the MongoDB service (use 'up' to start or 'down' to stop)
create-private-key      - Generate a private key for the Rayls service
privacy-ledger          - Manage the Privacy Ledger service (use 'up' to start or 'down' to stop)
create-relayer-secrets  - Generate secrets for the relayer service
relayer                 - Manage the Relayer service along with KMM, Atomic, and Circom-API (use 'up' to start or 'down' to stop)
down-all                - Stop all running services and remove associated volumes
destroy-all             - Permanently delete the Rayls, MongoDB, and OpenZeppelin data (requires confirmation)
```

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
make mongodb up
```

- Para utilizar um cluster MongoDB gerenciado, basta inserir a string de conexão `MONGODB_CONNECTION_STRING` no `.env`.

## Instalando o ambiente Rayls

### Privacy Ledger

1. Crie uma chave `PRIVATE_KEY_SYSTEM` para a Privacy Ledger e atualize a variável no `.env`:

```bash
make create-private-key
```
`.env`
```bash
PRIVATE_KEY_SYSTEM=0x1234567890123456789012345678901234567890123456789012345689
```

2. Inicie a aplicação utilizando o comando:
```bash
make privacy-ledger up
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

- O processo de deploy dos contratos da Privacy Ledger será realizado automaticamente.

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

1. Crie as chaves necessárias para o relayer executando o seguinte script:
```bash
make create-relayer-secrets
```

2. Atualize as variáveis na sessão `# Relayer variables`
```bash
# Relayer variables
BLOCKCHAIN_PLSTARTINGBLOCK=100
BLOCKCHAIN_EXECUTOR_BATCH_MESSAGES=500
BLOCKCHAIN_PLENDPOINTADDRESS=0x1234567890abcdef1234567890abcdef12345678
BLOCKCHAIN_LISTENER_BATCH_BLOCKS=50
BLOCKCHAIN_STORAGE_PROOF_BATCH_MESSAGES=200
BLOCKCHAIN_ENYGMA_PL_EVENTS=0x1234567890abcdef1234567890abcdef12345678
COMMITCHAIN_CCSTARTINGBLOCK=123456 # Gerado no Deploy dos Contratos da Commit Chain
COMMITCHAIN_ATOMICREVERTSTARTINGBLOCK=123456 # Gerado no Deploy dos Contratos da Commit Chain
BLOCKCHAIN_KMS_API_KEY="API_KEY"
BLOCKCHAIN_KMS_SECRET="API_SECRET"
KMS_API_KEY="API_KEY"
KMS_SECRET="API_SECRET"
```

2. Inicialize os componentes:
```bash
make relayer up
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