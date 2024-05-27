# Rayls Setup VEN Operator

## Docker

### Pré-requisitos

- Acesso ao repositório da Parfin (registry.parfin.io)
- WSL/Sistema operacional Linux
- [Make](https://www.gnu.org/software/make/)
- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Docker](https://docs.docker.com/engine/install/ubuntu/)
- [Docker Compose](https://docs.docker.com/compose/install/)


### Realizando o deploy dos contratos na Commit Chain

Realizar login no registry da Parfin
```bash
docker login registry.parfin.io
```

Para realizar o deploy dos contratos na Commit Chain é necessário apenas rodar o seguinte comando, após alterar as variáveis `RPC_URL_NODE_CC`, `NODE_CC_CHAIN_ID` e `PRIVATE_KEY_SYSTEM`:

> ℹ️ Caso nenhuma `PRIVATE_KEY_SYSTEM` seja informada na variável, uma chave aleatória será gerada e disponibilizada no output do console.


docker-compose.yml
```yaml
services:
  commit-chain-contract:
      network_mode: host
      image: registry.parfin.io/rayls-contracts:v1.8.1
      stdin_open: true
      tty: true
      environment:
      - RPC_URL_NODE_CC=RPC_URL_NODE_CC
      - NODE_CC_CHAIN_ID=NODE_CC_CHAIN_ID
      - PRIVATE_KEY_SYSTEM=PRIVATE_KEY_SYSTEN
```

```bash
make deploy-commit-chain-contract
```

Após executar esse comando o output estará disponível tanto na raíz do projeto no arquivo commit-chain-contract.txt quando no output do terminal. Exemplo:

```bash
🚀🚀 Starting deploy of Commit Chain 🚀🚀
It can take some minutes, perfect time to bring a coffe ☕
✅ Finished deploy of CC 
👉 CommitChain Configuration to include on Relayer, Listener, Flagger. Share these variables to Participants.
ENV FORMAT:
RELAYER_COMMITCHAIN_COMMITCHAINPLSTORAGECONTRACT=0xExAMPL0AFa067aCC9EXAMPLE6C382282bEXAMPL1
RELAYER_COMMITCHAIN_PARTICIPANTSTORAGECONTRACT=0x12345678ABCD1234EF56789012ABCDEF12345678
RELAYER_COMMITCHAIN_CHAINID=EXAMPL
RELAYER_COMMITCHAIN_CCSTARTINGBLOCK=733113
RELAYER_COMMITCHAIN_VERSION="1.8"
RELAYER_COMMITCHAIN_ATOMICTELEPORTCONTRACT=0x87654321FEDC9876BA0987654321FEDCBA987654
RELAYER_COMMITCHAIN_RESOURCEREGISTRYCONTRACT=0xABCDEF0123456789ABCDEF0123456789ABCDEF01
RELAYER_COMMITCHAIN_CCENDPOINTADDRESS=0x9876543210FEDCBA9876543210FEDCBA98765432
RELAYER_COMMITCHAIN_BALANCECOMMITMENTCONTRACT=0xFEDCBA9876543210FEDCBA9876543210FEDCBA98
RELAYER_COMMITCHAIN_TOKENREGISTRYCONTRACT=0xCDEF0123456789ABCDEF0123456789ABCDEF0123

JSON FORMAT:
{
    "CommitChainPLStorageContract": "0xExAMPL0AFa067aCC9EXAMPLE6C382282bEXAMPL1",
    "ParticipantStorageContract": "0x12345678ABCD1234EF56789012ABCDEF12345678",
    "ChainId": "EXAMPL",
    "CcStartingBlock": 733113,
    "Version": "1.8",
    "AtomicTeleportContract": "0x87654321FEDC9876BA0987654321FEDCBA987654",
    "ResourceRegistryContract": "0xABCDEF0123456789ABCDEF0123456789ABCDEF01",
    "CcEndpointAddress": "0x9876543210FEDCBA9876543210FEDCBA98765432",
    "BalanceCommitmentContract": "0xFEDCBA9876543210FEDCBA9876543210FEDCBA98",
    "TokenRegistryContract": "0xCDEF0123456789ABCDEF0123456789ABCDEF0123"
}
```
> ℹ️ Importante armazenar os valores acima pois eles serão disponibilizados para os participantes da network e também para os [Rayls Components](../kubernetes/README.md#rayls-components).

### Adicionando novos participantes

Após [realizar o deploy dos contratos na Commit Chain](#realizando-o-deploy-dos-contratos-na-commit-chain) já é possível adicionar novos participantes na network. Para isso será necessário realizar a alterações das seguintes variáveis:

| Variável                                     | Descrição                                                                                                               |
|----------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|
| PRIVATE_KEY_SYSTEM                           | A variável `PRIVATE_KEY_SYSTEM` deverá ser a mesma que foi gerada ou adicionada no deploy dos contratos da Commit Chain |
| PARTICIPANT_STORAGE_ADDRESS                  | Encontrada `ParticipantStorageContract` ou `RELAYER_COMMITCHAIN_PARTICIPANTSTORAGECONTRACT` no output do step anterior  |
| PARTICIPANT_CHAIN_ID                         | CHAIN_ID do participante                                                                                                |
| PARTICIPANT_NAME                             | Nome do participante                                                                                                    |
| PARTICIPANT_ROLE                             | Existem 3 tipos de roles: Participant - 0, Issuer - 1, Auditor - 2                                                      |

```yaml
  add-participant:
      image: registry.parfin.io/rayls-contracts:v1.8.1
      command: ["addParticipant"]
      environment:
      - RPC_URL_NODE_CC=COMMIT_CHAIN_URL
      - NODE_CC_CHAIN_ID=COMMIT_CHAIN_ID
      - PRIVATE_KEY_SYSTEM=PRIVATE_KEY_SYSTEM
      - PARTICIPANT_STORAGE_ADDRESS=PARTICIPANT_STORAGE_ADDRESS
      - PARTICIPANT_CHAIN_ID=PARTICIPANT_CHAIN_ID
      - PARTICIPANT_NAME=PARTICIPANT_NAME
      - PARTICIPANT_ROLE=PARTICIPANT_ROLE
      - PARTICIPANT_OWNER_ADDRESS=0x0000000000000000000000000000000000000000
```

Após isso execute o seguinte comando:

```bash
make add-participant
```

O output de sucesso deverá ser:
```bash
Participant Successfully added!
```

Caso o participante já tenha sido adicionado uma mensagem de erro será retornada:

```bash
  code: 'CALL_EXCEPTION',
  action: 'estimateGas',
  data: '0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001a5061727469636970616e7420616c726561647920657869737473000000000000',
  reason: 'Participant already exists',
  transaction: {
    to: '0x6548DB08755D22537D731980F030E2707eC71c96',
    data: '0x7b7dae1f000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000186355c80000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000000000000000000000000000000000000000002a30783030303030303030303030303030303030303030303030303030303030303030303030303030303000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001268656e72697175652d626163656e2d706f630000000000000000000000000000',
    from: '0xf9260C378ea6E428A79EAfe443BD24EA09Af8Bc9'
  },
  invocation: null,
  revert: {
    signature: 'Error(string)',
    name: 'Error',
    args: [ 'Participant already exists' ]
  },
  shortMessage: 'execution reverted: "Participant already exists"',
  info: {
    error: {
      code: -32000,
      message: 'Execution reverted: Participant already exists',
      data: '0x08c379a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000001a5061727469636970616e7420616c726561647920657869737473000000000000'
    },
    payload: {
      method: 'eth_estimateGas',
      params: [Array],
      id: 3,
      jsonrpc: '2.0'
    }
  }
}
```

Após executar esses passos, ja é possível inicializar o [Setup Kubernetes](#setup-kubernetes)

## Setup Kubernetes

### Pré-requisitos

- Acesso ao repositório da Parfin (registry.parfin.io)
- [Kubernetes](https://kubernetes.io/docs/setup/)
- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [PostgreSQL](https://www.postgresql.org/)

### Criação da base de dados para os Rayls Components

Nesta versão os Rayls Components não realizam a criação da base de dados de forma automática, para realizar a criação basta seguir os seguintes passos:

1. Realizar login no banco de dados previamente criado:
```bash
psql -h hostname -p port -U username -d database
```

2. Crie a base de dados:
```bash
CREATE DATABASE novobanco;
```

3. Verifique se o banco de dados foi criado listando todos os bancos de dados:
```bash
\l
```

Essa base de dados será utilizada por todos os componentes da Rayls.

### Rayls Components

#### Gerando as chaves para os Rayls Components

Para facilitar o processo de geração do DhPublic e DHSecret, criamos um binário chamado `dhgen` que pode ser baixado em nosso [registry](https://nexus.parfin.io)

```bash
./dhgen  
SECRET KEY: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  
PUBLIC KEY: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  
Successfully created keys
```

#### Namespace

- Crie o namespace que será utilizado pelas aplicações

```bash
kubectl create namespace <namespace>
```

#### Adicionando as credenciais no cluster Kubernetes

- Crie a secret que concederá acesso ao registry.parfin.io. Caso seu cluster tenha acesso ao registry ou esteja utilizando um repositório interno, esse passo é opcional. 

> **⚠️ Atenção:**
>
> Essas credenciais serão concedidas por TBD.

```bash
kubectl create secret docker-registry registry-parfin-io --docker-server=registry.parfin.io --docker-username=xxxxx --docker-password=xxxxx --namespace=xxxxx
```

#### Governance API

1. Altere as variáveis necessárias no ConfigMap.yml. As variáveis de ambiente deverão ser preenchidas com o output gerado no [Deploy dos contratos na Commit Chain](../docker/README.md#realizando-o-deploy-dos-contratos-na-commit-chain)

| Variável                                 | Descrição                                                                |
|------------------------------------------|--------------------------------------------------------------------------|
| Database.ConnectionString                | host=host user=username password=password dbname=database_name port=5432 |
| CommitChain.URL                          | URL RPC da Commit Chain                                                  |
| CommitChain.PLStorage                    | `CommitChainPLStorageContract` gerado no deploy dos contratos na Commit Chain|
| CommitChain.TokenRegistry                | `TokenRegistryContract` gerado no deploy dos contratos na Commit Chain |
| CommitChain.PrivateKey                   | `PRIVATE_KEY_SYSTEM` utilizada no deploy dos contratos na Commit Chain   |
| CommitChain.ChainId                      | ChainID da Commit Chain                                                  |
| CommitChain.DHPublic                     | Chave gerada em [Gerando as chaves para os Rayls Components](#gerando-as-chaves-para-os-rayls-components)|
| CommitChain.DHSecret                     | Chave gerada em [Gerando as chaves para os Rayls Components](#gerando-as-chaves-para-os-rayls-components)|
| CommitChain.StartingBlock                | `StartingBlock` gerado no deploy dos contratos na Commit Chain Block                                              |
| CommitChain.OperatorChainId              | Deverá ser `999`                                   |
| CommitChain.BatchSize                    | Deverá ser `20`                                  |

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rayls-api
data:
  config.json: |
    {
      "Database": {
        "Type": "postgresql",
        "ConnectionString": "host=postgres user=postgres password=postgres dbname=raylsdb port=5432"
      },
      "CommitChain": {
         "URL": "xxxxxxxxxxxxxxxx",
         "PLStorage": "xxxxxxxxxxxxxxx",
         "TokenRegistry": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
         "PrivateKey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
         "ChainId": "xxxxxxxx",
         "DHPublic": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
         "DHSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
         "StartingBlock": xxxxxxxx,
         "OperatorChainId": "999",
         "BatchSize": "20"
       },
      "Logging": "development"
    }
```
   
- Execute os manifestos da pasta `kubernetes/rayls/api`


```bash
kubectl apply -f rayls/api -n <namespace>
```

Output de sucesso:

```bash
[GIN] 2024/05/31 - 18:50:49 | 200 | 2.025881ms | 10.15.8.55 | GET "/flagged"
```

#### Flagger

1. Altere as variáveis necessárias no ConfigMap.yml. As variáveis de ambiente deverão ser preenchidas com o output gerado no [Deploy dos contratos na Commit Chain](../docker/README.md#realizando-o-deploy-dos-contratos-na-commit-chain)

| Variável                                 | Descrição                                                                |
|------------------------------------------|--------------------------------------------------------------------------|
| Database.ConnectionString                | host=host user=username password=password dbname=database_name port=5432 |
| CommitChain.URL                          | URL RPC da Commit Chain                                                  |
| CommitChain.PLStorage                    | `CommitChainPLStorageContract` gerado no deploy dos contratos na Commit Chain|
| CommitChain.TokenRegistry                | `TokenRegistryContract` gerado no deploy dos contratos na Commit Chain |
| CommitChain.PrivateKey                   | `PRIVATE_KEY_SYSTEM` utilizada no deploy dos contratos na Commit Chain   |
| CommitChain.ChainId                      | ChainID da Commit Chain                                                  |
| CommitChain.DHPublic                     | Chave gerada em [Gerando as chaves para os Rayls Components](#gerando-as-chaves-para-os-rayls-components)|
| CommitChain.DHSecret                     | Chave gerada em [Gerando as chaves para os Rayls Components](#gerando-as-chaves-para-os-rayls-components)|
| CommitChain.StartingBlock                | `StartingBlock` gerado no deploy dos contratos na Commit Chain Block                                              |
| CommitChain.OperatorChainId              | Deverá ser `999`                                   |
| CommitChain.BatchSize                    | Deverá ser `20`                                  |

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rayls-flagger
data:
  config.json: |
    {
      "Database": {
        "Type": "postgresql",
        "ConnectionString": "host=postgres user=postgres password=postgres dbname=raylsdb port=5432"
      },
      "CommitChain": {
         "URL": "xxxxxxxxxxxxxxxx",
         "PLStorage": "xxxxxxxxxxxxxxx",
         "TokenRegistry": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
         "PrivateKey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
         "ChainId": "xxxxxxxx",
         "DHPublic": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
         "DHSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
         "StartingBlock": xxxxxxxx,
         "OperatorChainId": "999",
         "BatchSize": "20"
       },
      "Logging": "development"
    }
```
   
- Execute os manifestos da pasta `kubernetes/rayls/flagger`


```bash
kubectl apply -f rayls/flagger -n <namespace>
```

Output de sucesso:

```bash
[18:50:37 2024-05-31] INFO: Starting the flagger service | 
[18:50:37 2024-05-31] INFO: No transactions to process | 
2024-05-31T18:50:42.808361641Z [18:50:42 2024-05-31] INFO: No transactions to process | 
2024-05-31T18:50:47.810310738Z [18:50:47 2024-05-31] INFO: No transactions to process | 
```

#### Listener

1. Altere as variáveis necessárias no ConfigMap.yml. As variáveis de ambiente deverão ser preenchidas com o output gerado no [Deploy dos contratos na Commit Chain](../docker/README.md#realizando-o-deploy-dos-contratos-na-commit-chain)

| Variável                                 | Descrição                                                                |
|------------------------------------------|--------------------------------------------------------------------------|
| Database.ConnectionString                | host=host user=username password=password dbname=database_name port=5432 |
| CommitChain.URL                          | URL RPC da Commit Chain                                                  |
| CommitChain.PLStorage                    | `CommitChainPLStorageContract` gerado no deploy dos contratos na Commit Chain|
| CommitChain.TokenRegistry                | `TokenRegistryContract` gerado no deploy dos contratos na Commit Chain |
| CommitChain.PrivateKey                   | `PRIVATE_KEY_SYSTEM` utilizada no deploy dos contratos na Commit Chain   |
| CommitChain.ChainId                      | ChainID da Commit Chain                                                  |
| CommitChain.DHPublic                     | Chave gerada em [Gerando as chaves para os Rayls Components](#gerando-as-chaves-para-os-rayls-components)|
| CommitChain.DHSecret                     | Chave gerada em [Gerando as chaves para os Rayls Components](#gerando-as-chaves-para-os-rayls-components)|
| CommitChain.StartingBlock                | `StartingBlock` gerado no deploy dos contratos na Commit Chain Block                                              |
| CommitChain.OperatorChainId              | Deverá ser `999`                                   |
| CommitChain.BatchSize                    | Deverá ser `20`                                  |

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rayls-listener
data:
  config.json: |
    {
      "Database": {
        "Type": "postgresql",
        "ConnectionString": "host=postgres user=postgres password=postgres dbname=raylsdb port=5432"
      },
      "CommitChain": {
         "URL": "xxxxxxxxxxxxxxxx",
         "PLStorage": "xxxxxxxxxxxxxxx",
         "TokenRegistry": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
         "PrivateKey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
         "ChainId": "xxxxxxxx",
         "DHPublic": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
         "DHSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
         "StartingBlock": xxxxxxxx,
         "OperatorChainId": "999",
         "BatchSize": "20"
       },
      "Logging": "development"
    }
```
   
- Execute os manifestos da pasta `kubernetes/rayls/listener`


```bash
kubectl apply -f rayls/listener -n <namespace>
```

Output de sucesso:

```bash
[18:53:43 2024-05-31] INFO: Connected to the commit chain | url=http://xxxxxxxxxxxxxxxxxxxxx:8545 
2024-05-31T18:53:43.402644870Z [18:53:43 2024-05-31] INFO: No latest block number found in the database | 
2024-05-31T18:53:43.412268108Z [18:53:43 2024-05-31] INFO: Processing blocks | From block=5238598 To Block=5238618
```

#### Privacy Ledger

> ⚠️ Reforçamos que o volume da Privacy Ledger está configurado utilizando o plugin HostPath para os testes. Caso o host seja destruído, os dados também serão removidos. 

Para outras abordagens relacionadas a persistência de dados do Kubernetes, seguem alguns links de drivers e access modes disponíveis:
- [Kubernetes Persistent Volumes Access Modes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes:)
- [AWS EFS CSI](https://docs.aws.amazon.com/pt_br/eks/latest/userguide/efs-csi.html)
- [Azure CSI](https://learn.microsoft.com/pt-br/azure/aks/azure-csi-disk-storage-provision)
- [Google Cloud Persistent Volumes ](https://cloud.google.com/kubernetes-engine/docs/concepts/persistent-volumes)

##### Executando a Privacy Ledger

1. Altere as variáveis de ambiente do StatefulSet.yml

| Variável                                     | Descrição                                                                                   |
|----------------------------------------------|---------------------------------------------------------------------------------------------|
| MONGODB_CONN                                 | Connection String do MongoDB. Exemplo: `mongodb+srv://<username>:<password>@<endpoint>`     |
| NETWORKID                                    | `CHAIN_ID` da Privacy Ledger                                                                |

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: rayls-privacy-ledger
  labels:
    app: rayls-privacy-ledger
spec:
  replicas: 1
  serviceName: rayls-privacy-ledger
  selector:
    matchLabels:
      app: rayls-privacy-ledger
  template:
    metadata:
      labels:
        app: rayls-privacy-ledger
    spec:
      volumes:
        - configMap:
            defaultMode: 0700
            name: rayls-privacy-ledger
          name: config
        - name: persistent-storage
          persistentVolumeClaim:
            claimName: rayls-privacy-ledger-pvc
      containers:
        - name: rayls-privacy-ledger
          image: registry.parfin.io/rayls-privacy-ledger:v1.8.5
          imagePullPolicy: Always
          command: ["/app/var/start.sh"]
          ports:
            - containerPort: 80
              name: 80tcp
              protocol: TCP
          livenessProbe:
            failureThreshold: 3
            httpGet:
              path: /
              port: 8545
              scheme: HTTP
            initialDelaySeconds: 180
            periodSeconds: 15
            successThreshold: 1
            timeoutSeconds: 1
          env:
            - name: DATADIR
              value: /app/data/raylz-private-ledger
            - name: MONGODB_DATABASE
              value: "rayls-privacy-ledger"
            - name: MINER_ETHERBASE
              value: "0x1bE478ee83095aF7F21bd84743fB39B68Dd600A6"
            - name: NETWORKID
              value: "change_me"
            - name: MONGODB_CONN
              value: "mongodb+srv://username:password@endpoint"
          volumeMounts:
            - mountPath: /app/var
              name: config
              readOnly: true
            - mountPath: /app/data
              name: persistent-storage
      imagePullSecrets:
        - name: registry-parfin-io
```

2. Alterar a capacidade de disco da Privacy Ledger nos manifestos PersistentVolume.yml e PersistentVolumeClaim
  - Recomendamos 2Gi para o período de testes

PersistentVolume.yml
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: rayls-privacy-ledger-sc
spec:
  storageClassName: rayls-privacy-ledger-sc
  capacity:
    storage: 2Gi
  accessModes:
    - ReadWriteOnce
  hostPath:
    path: "/mnt/data"
```

PersistentVolumeClaim.yml
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: rayls-privacy-ledger-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: rayls-privacy-ledger-sc
  resources:
    requests:
      storage: 2Gi
```

3. Alterar o `chainId` da Privacy Ledger no arquivo ConfigMap.yml
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rayls-privacy-ledger
data:
  genesis.json: |
    {
      "config": {
       "chainId": xxxxxxxxxxxxx,
       "homesteadBlock": 0,
       "eip150Block": 0,
       "eip155Block": 0,
       "eip158Block": 0,
       "byzantiumBlock": 0,
       "constantinopleBlock": 0,
       "petersburgBlock": 0,
       "istanbulBlock": 0,
       "berlinBlock": 0,
       "ethash": {}
      },
      "difficulty": "1",
      "gasLimit": "9000000000000",
      "alloc": {
        "0x5f2E7061aDd05c8B4C2b48054E5A591eFFa270Aa": {
          "balance": "300000000000000000000000"
        }
      }
    }
```

4. Execute os manifestos da pasta `kubernetes/rayls/privacy-ledger`

```bash
kubectl apply -f rayls/privacy-ledger -n <namespace>
```

O log da Privacy Ledger deverá conter o seguinte output antes de executar o Relayer:
```bash
INFO [05-29|13:51:03.539] Looking for peers  peercount=0 tried=0 static=0
INFO [05-29|13:51:15.556] Looking for peers  peercount=0 tried=8 static=0
```
> ⚠️ Importante validar que o CHAIND no log seja o mesmo que foi ajustado no StatefulSet.yml e também no ConfigMap.yml

#### Relayer

1. Altere as variáveis necessárias no ConfigMap.yml

| Variável                                     | Descrição                                                                         |
|----------------------------------------------|-----------------------------------------------------------------------------------|
| Database.ConnectionString                |Connection String do MongoDB. Exemplo: `mongodb+srv://<username>:<password>@<endpoint>`|
| Blockchain.ChainId                       | `CHAIN_ID` da Privacy Ledger                                                          |
| Blockchain.ChainURL                      | URL RPC da Privacy Ledger                                                             |
| Blockchain.ChainWSURL                    | URL WebSocket da Privacy Ledger                                                       |
| CommitChain.ChainURL                     | URL RPC da Commit Chain                                                               |
| CommitChain.ChainWSUrl                   | URL Web Socket da Commit Chain                                                        |
| CommitChain.CommitChainPLStorageContract | Commit Chain Privacy Ledger Storage Contract                                          |
| CommitChain.ParticipantStorageContract   | Participant Storage Contract                                                          |
| CommitChain.ChainId                      | ChainID da Commit Chain                                                               |
| CommitChain.CcStartingBlock              | Commit Chain Starting Block                                                           |
| CommitChain.AtomicTeleportContract       | Commit Chain Atomic Teleport Contract                                                 |
| CommitChain.ResourceRegistryContract     | Commit Chain Resource Registry Contract                                               |
| CommitChain.CcEndpointAddress            | Commit Chain Endpoint Address                                                         |
| CommitChain.BalanceCommitmentContract    | Commit Chain Balance Commitment Contract                                              |
| CommitChain.TokenRegistryContract        | Commit Chain Token Registry Contract 


```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: rayls-relayer
data:
  config.json: |
    {
      "Database": {
        "ConnectionString": "mongodb+srv://username:password@endpoint",
        "Name": "rayls-relayer",
        "Type": "mongodb"
      },
      "Blockchain": {
        "ChainID": "xxxxxxxxxx",
        "ChainURL": "http://rayls-privacy-ledger:8545",
        "ChainWSURL": "ws://rayls-privacy-ledger:8660",
        "BatchSize": 1000,
        "StartingBlock": "0"
      },
      "CommitChain": {
        "ChainURL": "xxxxxxxxxxxxx",
        "ChainWSUrl": "xxxxxxxxxxx",
        "CommitChainPLStorageContract": "xxxxxxxxxxxxx",
        "ParticipantStorageContract": "xxxxxxxxxxxxx8",
        "ChainId": "xxxxxxxxxxxxx",
        "CcStartingBlock": xxxxxxxxxxxxx,
        "Version": "1.8",
        "AtomicTeleportContract": "xxxxxxxxxxxxx",
        "ResourceRegistryContract": "xxxxxxxxxxxxx",
        "CcEndpointAddress": "xxxxxxxxxxxxx",
        "BalanceCommitmentContract": "xxxxxxxxxxxxx",
        "TokenRegistryContract": "xxxxxxxxxxxxx",
        "OperatorChainId": "999"
      }
    }
```
O Relayer necessita das seguintes chaves para comunicação no bloco de configuração da Blockchain:

```json
"Blockchain": {
  "ChainID": "xxxxxxxxxx",
  "ChainURL": "http://rayls-privacy-ledger:8545",
  "ChainWSURL": "ws://rayls-privacy-ledger:8660",
  "BatchSize": 1000,
  "StartingBlock": "0",
  "DhSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "DhPublic": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "PrivateKey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

Caso essas chaves não sejam informadas, elas serão geradas automaticamente e gravadas no banco de dados na base do relayer.

   
2. Execute os manifestos da pasta `kubernetes/rayls/relayer`

```bash
kubectl apply -f rayls/relayer/ -n <namespace>
```

Os logs do pod em um cenário de sucesso será:
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

> ⚠️ Importante armazenar os valores do `Endpoint Address from Privacy Ledger`, ele será utilizado pelo time de desenvolvimento