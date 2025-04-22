# Setup Kubernetes

## Pré-requisitos

- [NodeJS](https://nodejs.org/en/download)
- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [Hardhat](https://hardhat.org/hardhat-runner/docs/getting-started#installation)
- [Foundry]()
- [Make](https://www.gnu.org/software/make/)
- [Helm](https://helm.sh/)
- [Kubernetes](https://kubernetes.io/docs/setup/)
- [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [Cluster MongoDB com ReplicaSet](#mongodb)

### Instalação de dependências

1. [Instale o NodeJS](https://nodejs.org/en/download)
2. Para realizar a instalação do `npm`, `hardhat` e `foundry`:
```bash
 make -C ../contracts setup-env
```

### Kubernetes Namespace

- Crie o namespace que será utilizado pelas aplicações.

```bash
kubectl create namespace <namespace>
```

### MongoDB

Tanto a Rayls Privacy Ledger quanto a Rayls Relayer necessitam de um cluster MongoDB com Replica Set configurado. Se não houver instalação do MongoDB com Replica Set, nem possibilidade de instalar ou usar o MongoDB Atlas, a Parfin oferece uma imagem de container do MongoDB 6 com Replica Set inicializado para o período de testes do Drex.

Essa imagem está disponível em `public.ecr.aws/rayls/rayls-mongors`

> **⚠️ Atenção:**
>
> Reforçamos que essa imagem estará disponível no repositório somente enquanto durarem os testes do Drex e que não deve ser utilizada em produção. A Parfin não se responsabiliza pelo suporte no Mongo ou caso ocorra alguma perda de dados relacionada a essa imagem.

> ⚠️ Reforçamos que o volume da MongoDB está configurado utilizando o plugin HostPath para os testes. Caso o host seja destruído, os dados também serão removidos.

Para realizar a instalação do MongoDB utilizando a imagem fornecida para Parfin.

```bash
helm install <release.name> charts/mongodb -n <namespace>
```

## Rayls Privacy Ledger

> ⚠️ Reforçamos que o volume da Privacy Ledger está configurado utilizando o plugin HostPath para os testes. Caso o host seja destruído, os dados também serão removidos. 

Para outras abordagens relacionadas a persistência de dados do Kubernetes, seguem alguns links de drivers e access modes disponíveis:
- [Kubernetes Persistent Volumes Access Modes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes:)
- [AWS EFS CSI](https://docs.aws.amazon.com/pt_br/eks/latest/userguide/efs-csi.html)
- [Azure CSI](https://learn.microsoft.com/pt-br/azure/aks/azure-csi-disk-storage-provision)
- [Google Cloud Persistent Volumes ](https://cloud.google.com/kubernetes-engine/docs/concepts/persistent-volumes)

### Executando a Privacy Ledger

O arquivo `./kubernetes/charts/privacy-ledger/values.yaml` define a configuração padrão para o deploy do Privacy Ledger no Kubernetes via Helm.

- Atualize as variáveis mandatórias:

| Parâmetro                    | Descrição                                                                 |
|-----------------------------|---------------------------------------------------------------------------|
| `privacyLedger.env.MONGODB_CONN` | URL de conexão com o MongoDB. Ex: `mongodb://<release>.<namespace>.svc.cluster.local:27017/admin?directConnection=true&replicaSet=rs0` |
| `privacyLedger.env.NETWORKID`    | O NETWORKID. Ex: `600123`                                                          |
| 

---

```yaml
privacyLedger:
  env:
    MONGODB_CONN: "mongodb://<release>.<namespace>.svc.cluster.local:27017/admin?directConnection=true&replicaSet=rs0"
    NETWORKID: 600123
```

- Após atualizar as variáveis, realize o deploy via Helm:

```bash
helm install privacy-ledger charts/privacy-ledger -n <namespace>
```

### Realizando deploy dos contratos da Privacy Ledger

1. Atualize o `.env` com a `PRIVATE_KEY_SYSTEM`, `RPC_URL_NODE_PL`, `NODE_PL_CHAIN_ID`, `RPC_URL_NODE_CC` e `WS_URL_NODE_CC`:

```bash
NODE_CC_CHAIN_ID="999990001"
RPC_URL_NODE_CC="http://<besu-endpoint>:8545"
WS_URL_NODE_CC="ws://<besu-endpoint>:8546"
PRIVATE_KEY_SYSTEM="0x0000000000000000000000000000000000000000"
RPC_URL_NODE_PL="http://<privacy-ledger-ingress-endpoint>/"
NODE_PL_CHAIN_ID="600123"
COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY="0x9bfe7a23fC8882D7A692d959C89c0c2A7266bfED"
```

2. Realize deploy dos contratos da Privacy Ledger:

```bash
make -C ../contracts deploy-privacy-ledger
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

> ℹ️ O arquivo `unknown-<NODE_PL_CHAIN_ID>.json` será adicionado automaticamente na pasta `./contracts/.openzeppelin`. É importante que esse arquivo seja versionado ao final do processo.

### Relayer, KMM, Atomic Service e Circom API

Após realizar o deploy da Governance API e Privacy Ledger será possível inicializar os demais componentes.

1. Crie as chaves `API_KEY` e `API_SECRET` rodando o seguinte script:
```bash
api_key=$(openssl rand -hex 16)
 
api_secret=$(openssl rand -hex 32)
 
echo "API_KEY=$api_key"
echo "API_SECRET=$api_secret"
```

2. Atualize as variáveis de ambiente em `./kubernetes/charts/relayer/values.yaml`.

```bash
  env:
    BLOCKCHAIN_DATABASE_TYPE: "mongodb"
    BLOCKCHAIN_KMS_OPERATION_SERVICE_ROOT_URL: "http://<relayer-release>-kmm-svc:8080"
    BLOCKCHAIN_CHAINID: 600123
    BLOCKCHAIN_CHAINURL: "http://<release-privacy-ledger>-svc:8545"
    BLOCKCHAIN_PLSTARTINGBLOCK: "0"
    BLOCKCHAIN_EXECUTOR_BATCH_MESSAGES: "500"
    BLOCKCHAIN_PLENDPOINTADDRESS: "0x0000000000000000000000000000000000000000"
    BLOCKCHAIN_LISTENER_BATCH_BLOCKS: "50"
    BLOCKCHAIN_STORAGE_PROOF_BATCH_MESSAGES: "200"
    BLOCKCHAIN_ENYGMA_PROOF_API_ADDRESS: "http://<relayer-release>-circomapi-svc:3000"
    BLOCKCHAIN_ENYGMA_PL_EVENTS: "0x0000000000000000000000000000000000000000"
    BLOCKCHAIN_DATABASE_CONNECTIONSTRING: "mongodb://<mongodb-release-name>.<namespace>.svc.cluster.local:27017/admin?directConnection=true&replicaSet=rs0"
    COMMITCHAIN_CHAINURL: "http://commitchain.example.com:8545"
    COMMITCHAIN_VERSION: "2.0"
    COMMITCHAIN_CHAINID: "999990001"
    COMMITCHAIN_CCSTARTINGBLOCK: "1990335"
    COMMITCHAIN_ATOMICREVERTSTARTINGBLOCK: "1990335"
    COMMITCHAIN_OPERATORCHAINID: "999"
    COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY: "0x9bfe7a23fC8882D7A692d959C89c0c2A7266bfED"
    COMMITCHAIN_CCENDPOINTMAXBATCHMESSAGES: "500"
    COMMITCHAIN_EXPIRATIONREVERTTIMEINMINUTES: "30"
    LOG_LEVEL: "Info"
    LOG_HANDLER: "Text"
    KMS_CORSDOMAIN: "*"
    KMS_AWSPROFILE: "xxx"
    KMS_AWSALIAS: "xxx"
    KMS_GCPPROJECT: "xxx"
    KMS_GCPLOCATION: "xxx"
    KMS_GCPKEYRING: "xxx"
    KMS_GCPCRYPTOKEY: "xxx"
    KMS_ENCRYPTORSERVICE: "plaintext"
    BLOCKCHAIN_KMS_API_KEY: "API_KEY"
    BLOCKCHAIN_KMS_SECRET: "API_SECRET"
    KMS_DATABASE_CONNECTIONSTRING: "mongodb://<mongodb-release-name>.<namespace>.svc.cluster.local:27017/admin?directConnection=true&replicaSet=rs0"
    KMS_API_KEY: "API_KEY"
    KMS_SECRET: "API_SECRET"
```

3. Realize o deploy via Helm:

```bash
helm install relayer charts/relayer -n <namespace>
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