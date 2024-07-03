# Setup Docker

## Pré-requisitos

Para que os componentes dos participantes do Drex possam utilizar a Rayls, é necessário:

- Acesso ao repositório piloto_rd_setup.
- Acesso ao registry da Parfin (registry.parfin.io)
- WSL/Sistema operacional Linux
- ChainID que foi disponibilizado previamente pelo Banco Central
- [Make](https://www.gnu.org/software/make/)
- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Docker](https://docs.docker.com/engine/install/ubuntu/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Cluster MongoDB com ReplicaSet](#mongodb)

Caso tenha alguma dúvida, na [FAQ](#faq) abaixo estão descritos os comandos para checar se os componentes estão instalados e quais as versões dos mesmos 

### Clonar Repositorio

> **⚠️ Atenção:**
>
> Os tokens de acesso pessoal são uma alternativa ao uso de senhas para autenticação no GitHub ao usar a API do GitHub ou a linha de comando.
> https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

- Faça clone do repositório piloto_rd_setup.
```bash
git clone https://github.com/raylsnetwork/piloto_rd_setup.git
```

### MongoDB

- Realizar login no registry da Parfin
```bash
docker login registry.parfin.io
```

Tanto a Rayls Privacy Ledger quanto a Rayls Relayer necessitam de um cluster MongoDB com Replica Set configurado. Na sessão [Instalação utilizando Docker Compose](#instalação-utilizando-docker-compose), é possível declarar as variáveis de Connection String do MongoDB.

Se não houver instalação do MongoDB com Replica Set, nem possibilidade de instalar ou usar o MongoDB Atlas, a Parfin oferece uma imagem de container do MongoDB 6 com Replica Set inicializado para o período de testes do Drex.

Essa imagem está disponível em `registry.parfin.io/mongo6_rs:latest`

> **⚠️ Atenção:**
>
> Reforçamos que essa imagem estará disponível no repositório somente enquanto durarem os testes do Drex e que não deve ser utilizada em produção. A Parfin não se responsabiliza pelo suporte no Mongo ou caso ocorra alguma perda de dados relacionada a essa imagem.


Caso queria utilizar essa imagem basta acessar a pasta docker e executar o seguinte comando: 

```bash
cd docker
make up-mongodb
```
Os logs do container serão exibidos automaticamente no terminal, o resultado esperado no log será:
```bash
{
  ok: 1,
  '$clusterTime': {
    clusterTime: Timestamp({ t: 1716990014, i: 21 }),
    signature: {
      hash: Binary.createFromBase64('AAAAAAAAAAAAAAAAAAAAAAAAAAA=', 0),
      keyId: Long('0')
    }
  },
  operationTime: Timestamp({ t: 1716990014, i: 21 })
}
REPLICA SET ONLINE
```
- Após isso basta interromper a execução dos logs utilizando o comando `ctrl + c`

#### Importante

- O container do mongo persistirá os dados no diretório ./mongodb/data
- Para pausar o cluster MongoDB, basta executar o comando make down-mongob
    - Este comando não irá remover os dados persistidos no diretório  ./mongodb/data, para remover basta executar o comando sudo rm -rf ./mongodb/data
- É essencial que o MongoDB esteja operacional para inicializar a Rayls Network


## Instalação utilizando Docker Compose

- Realizar login no registry da Parfin
```bash
docker login registry.parfin.io
```

### Criação dos diretórios e arquivos de configuração

> ℹ️ Caso esteja utilizando a imagem disponibilizada pela Parfin, a string de conexão `MONGODB_CONN` deverá ser `mongodb://mongodb:27017/admin?directConnection=true&replicaSet=rs0`
>
> Caso esteja utilizando um cluster provisionado (MongoDB Atlas), utilize o seguinte padrão `mongodb+srv://username:password@endpoint`

Para criar os diretórios e arquivos de configuração basta acessar a pasta docker e executar o seguinte comando:

```bash
cd docker
make init CHAINID=xxxxxxxxxx MONGODB_CONNECTION_STRING='xxxxxxxxxx'
```

- Este comando irá configurar todos os diretórios necessários para inicializarmos a Privacy Ledger e Relayer. Segue exemplo do output gerado.

```bash
Directories created:
./rayls/privacy-ledger/data
./rayls/privacy-ledger/var
./rayls/relayer/var

Files created:
./rayls/privacy-ledger/var/genesis.json
./rayls/privacy-ledger/var/config.toml
./rayls/privacy-ledger/var/start.sh
./docker-compose.yml

CHAINID was updated in the following files:
./rayls/privacy-ledger/var/genesis.json
./rayls/privacy-ledger/var/start.sh
```

### Docker Compose

- Após a [Criação dos diretórios e arquivos de configuração](#criação-dos-diretórios-e-arquivos-de-configuração), será necessário atualizar as seguintes variáveis no arquivo docker-compose.yml localizado na pasta "docker".


| Variável                                     | Descrição                                                                                   |
|----------------------------------------------|---------------------------------------------------------------------------------------------|
| RELAYER_COMMITCHAIN_CHAINURL               | URL RPC da Commit Chain                                                                     |
| RELAYER_COMMITCHAIN_CHAINWSURL             | URL Web Socket da Commit Chain                                                              |
| RELAYER_COMMITCHAIN_COMMITCHAINPLSTORAGECONTRACT | Commit Chain Privacy Ledger Storage Contract                                       |
| RELAYER_COMMITCHAIN_PARTICIPANTSTORAGECONTRACT | Participant Storage Contract                                                         |
| RELAYER_COMMITCHAIN_CHAINID                | ChainID da Commit Chain                                                                     |
| RELAYER_COMMITCHAIN_CCSTARTINGBLOCK        | Commit Chain Starting Block                                                                 |
| RELAYER_COMMITCHAIN_CCATOMICREVERTSTARTINGBLOCK | Deverá ser o mesmo do Commit Chain Starting Block                                      |
| RELAYER_COMMITCHAIN_ATOMICTELEPORTCONTRACT | Commit Chain Atomic Teleport Contract                                                       |
| RELAYER_COMMITCHAIN_RESOURCEREGISTRYCONTRACT | Commit Chain Resource Registry Contract                                              |
| RELAYER_COMMITCHAIN_CCENDPOINTADDRESS      | Commit Chain Endpoint Address                                                               |
| RELAYER_COMMITCHAIN_BALANCECOMMITMENTCONTRACT | Commit Chain Balance Commitment Contract                                            |
| RELAYER_COMMITCHAIN_TOKENREGISTRYCONTRACT  | Commit Chain Token Registry Contract                                                        |

```yaml
services:
  privacy-ledger:
    image: registry.parfin.io/rayls-privacy-ledger:v1.8.6
    entrypoint: ["/app/var/start.sh"]
    volumes:
      - ./rayls/privacy-ledger/data:/app/data
      - ./rayls/privacy-ledger/var/config.toml:/app/var/config.toml:ro
      - ./rayls/privacy-ledger/var/genesis.json:/app/var/genesis.json:ro
      - ./rayls/privacy-ledger/var/start.sh:/app/var/start.sh
    environment:
      - MONGODB_DATABASE=rayls-privacy-ledger
      - MONGODB_CONN=mongodb+srv://username:password@endpoint
    ports:
      - 8545:8545
      - 8660:8660
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8545"]
      interval: 30s
      timeout: 10s
      retries: 5
  relayer:
      image: registry.parfin.io/rayls-relayer:v1.8.6.1
      entrypoint: ["/app/raylz-relayer", "run", "--config", "/app/var/empty-config.json"]
      volumes:
       - ./rayls/relayer/var/config.json:/app/var/empty-config.json:ro
      restart: on-failure
      environment:
      - RELAYER_DATABASE_TYPE=mongodb
      - RELAYER_DATABASE_NAME=rayls-relayer
      - RELAYER_DATABASE_CONNECTIONSTRING=mongodb+srv://username:password@endpoint
      - RELAYER_BLOCKCHAIN_CHAINURL=http://privacy-ledger:8545
      - RELAYER_BLOCKCHAIN_CHAINWSURL=ws://privacy-ledger:8660  
      - RELAYER_BLOCKCHAIN_CHAINID=xxxxxxxxxxxxxxxxx
      - RELAYER_BLOCKCHAIN_BATCHSIZE=1500
      - RELAYER_COMMITCHAIN_CHAINURL=xxxxxxxxxxxxxxxxx
      - RELAYER_COMMITCHAIN_CHAINWSURL=xxxxxxxxxxxxxxxxx
      - RELAYER_COMMITCHAIN_COMMITCHAINPLSTORAGECONTRACT=xxxxxxxxxxxxxxxxx
      - RELAYER_COMMITCHAIN_PARTICIPANTSTORAGECONTRACT=xxxxxxxxxxxxxxxxx
      - RELAYER_COMMITCHAIN_CHAINID=xxxxxxxxxxxxxxxxx
      - RELAYER_COMMITCHAIN_CCSTARTINGBLOCK=xxxxxxxxxxxxxxxxx
      - RELAYER_COMMITCHAIN_CCATOMICREVERTSTARTINGBLOCK=xxxxxxxxxxxxxxxxx
      - RELAYER_COMMITCHAIN_VERSION=1.8"
      - RELAYER_COMMITCHAIN_ATOMICTELEPORTCONTRACT=xxxxxxxxxxxxxxxxx
      - RELAYER_COMMITCHAIN_RESOURCEREGISTRYCONTRACT=xxxxxxxxxxxxxxxxx
      - RELAYER_COMMITCHAIN_CCENDPOINTADDRESS=xxxxxxxxxxxxxxxxx
      - RELAYER_COMMITCHAIN_BALANCECOMMITMENTCONTRACT=xxxxxxxxxxxxxxxxx
      - RELAYER_COMMITCHAIN_TOKENREGISTRYCONTRACT=xxxxxxxxxxxxxxxxx
      - RELAYER_COMMITCHAIN_OPERATORCHAINID=999
      depends_on:
      - privacy-ledger
```

#### Inicializando a Privacy Ledger

Para inicializar a Privacy Ledger basta executar o comando abaixo:

```bash
make up-privacy-ledger
```

Este comando inicializará a Privacy Ledger:

```bash
 ✔ Container docker-privacy-ledger-1    Started
```

O log da Privacy Ledger deverá conter o seguinte output antes de inicializar o Relayer:
```bash
INFO [05-29|13:51:03.539] Looking for peers  peercount=0 tried=0 static=0
INFO [05-29|13:51:15.556] Looking for peers  peercount=0 tried=8 static=0
```
Após isso basta interromper a execução dos logs utilizando o comando `ctrl + c`

#### Inicializando o Relayer

Após verificar que a Privacy Ledger está totalmente operacional execute o Relayer

```bash
make up-relayer
```

Este comando inicializará o Relayer:
```bash
 ✔ Container docker-privacy-ledger-1  Running
 ✔ Container docker-relayer-1         Started  
```

Os logs do container serão exibidos automaticamente no terminal, o resultado esperado no log será:
```bash
[14:21:10 2024-05-29] DEBUG: Attempt to ensure private keys set and contracts deployed | 
[14:21:10 2024-05-29] INFO: Check if Private Ledger has Private Keys defined... | 
[14:21:10 2024-05-29] INFO: Check if Private Ledger is deployed... | 
[14:21:10 2024-05-29] INFO: Deployment not found | Version="1.8" 
[14:21:10 2024-05-29] INFO: No other deployment found for this version. Starting a new deployment... | 
[14:21:10 2024-05-29] INFO: Deploying Private Ledger contracts | 
[14:21:10 2024-05-29] INFO: SignatureStorage deployment transaction sent | TX_HASH=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 
[14:21:42 2024-05-29] INFO: DeployRaylzMessageExecutor deployment transaction sent. Hash: | TX_HASH=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 
[14:21:52 2024-05-29] INFO: DeployEndpoint deployment transaction sent: | TX_HASH=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 
[14:21:55 2024-05-29] INFO: DeployRaylzContractFactory deployment transaction sent. Hash: | TX_HASH=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx 
[14:22:12 2024-05-29] INFO: Deployment document inserted | version="1.8" 
[14:22:12 2024-05-29] INFO: 📝 Endpoint Address from Private Ledger  | ADDRESS=0xExEMPL0AFa067aCC9EXAMPLE6C382282bEXAMPL1
```
Após isso basta interromper a execução dos logs utilizando o comando `ctrl + c`

> ⚠️ Importante armazenar os valores do `Endpoint Address from Privacy Ledger`.

### FAQ

#### Comandos para verificar os pré requisitos e as versões instaladas

Linux: `uname -a` -> Este comando irá exibir a versão do Sistema Operacional e informações do Kernel
git: `git --version` -> Este comando irá exibir a versão do git instalada. Se não estiver será retornado um erro dizendo que o git não foi encontrado
make: `make --version` -> Este comando irá exibir a versão do make instalada. Se não estiver será retornado um erro dizendo que o make não foi encontrado
docker: `docker --version` -> Este comando irá exibir a versão do docker instalada. Se não estiver será retornado um erro dizendo que o docker não foi encontrado
docker compose: `docker compose version` -> Este comando irá exibir a versão do docker compose instalada. Se não estiver será retornado um erro dizendo que o docker compose não foi encontrado

#### Como verifico os comandos disponíveis neste projeto?

Para verificar os comandos disponíveis basta rodar o comando `make help`

```bash
init                - Initialize the participant. Example: make init CHAINID=xxxxxxxxxx MONGODB_CONNECTION_STRING='mongodb+srv://username:password@endpoint'
destroy-rayls       - Destroy the Rayls directory
destroy-mongodb     - Destroy the Mongodb directory
destroy-compose     - Destroy Docker Compose file
destroy-all         - Destroy the Rayls directory, Mongodb directory and Docker Compose file
up-mongodb          - Start the MongoDB Cluster
down-mongodb        - Stop the MongoDB Cluster and remove orphans
up-privacy-ledger   - Start the Privacy ledger
up-relayer          - Start the Relayer
down-privacy-ledger - Start the Privacy ledger
down-relayer        - Start the Relayer
down-rayls          - Stop the Privacy Ledger, Relayer and remove orphans
```

#### Como verifico os logs dos containers:

Para visualizar os logs dos containers basta executar os seguintes comandos:

```bash
docker logs docker-privacy-ledger-1 -f
docker logs docker-relayer-1 -f
```
