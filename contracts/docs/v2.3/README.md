# Setup Guide for Version 2.3

## System Architecture

For a visual representation of how the system works in this version, refer to the [diagram](v2.3-diagram.png)

#### Note: The diagram provides a simplified view, illustrating how the new Encryptor service integrates into the system. It highlights the creation of the DH keypair and ECDSA keys, the process of passing parsed events to the Encryption service before they reach the CC, and how messages are decrypted on the destination side. For clarity, the Atomic service is omitted, as it remains unchanged and does not impact the current flow.

## Prerequisites
To run version 2.3, you need at least:
- 2 PL Nodes
- 2 Encryption Services
- 2 Relayers
- 2 Atomic Services
- 1 CommitChain Node

## Environment Configuration
This is how the .env files should look like for each service:

### 1. Contracts repository `.env` file
```dotenv
PRIVATE_KEY_SYSTEM=
RPC_URL_NODE_A=
RPC_URL_NODE_B=
RPC_URL_NODE_CC=
NODE_A_CHAIN_ID=
NODE_B_CHAIN_ID=
NODE_CC_CHAIN_ID=
NODE_A_ENDPOINT_ADDRESS=
NODE_B_ENDPOINT_ADDRESS=
COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY=
PARTICIPANTS=

# Enigma test specific (optional, DB URI and NAME)
NODE_A_MONGO_CS=
NODE_A_MONGO_CS_DBNAME=
NODE_B_MONGO_CS=
NODE_B_MONGO_CS_DBNAME=
```

### 2. Encryption service `.env` file
```dotenv
KMS_DATABASE_NAME=
KMS_DATABASE_CONNECTIONSTRING=
KMS_CORSDOMAIN=
KMS_API_KEY=
KMS_SECRET=
KMS_AWSPROFILE=
KMS_AWSALIAS=
KMS_GCPPROJECT=
KMS_GCPLOCATION=
KMS_GCPKEYRING=
KMS_GCPCRYPTOKEY=
KMS_ENCRYPTORSERVICE=
LOG_LEVEL=
LOG_HANDLER=
```

### 3. Relayer and Atomic service `.env` files
```dotenv
# PL Configuration
BLOCKCHAIN_DATABASE_TYPE=
BLOCKCHAIN_DATABASE_NAME=
BLOCKCHAIN_DATABASE_CONNECTIONSTRING=
BLOCKCHAIN_DHPUBLIC=
BLOCKCHAIN_KMS_API_KEY=
BLOCKCHAIN_KMS_SECRET=
BLOCKCHAIN_KMS_OPERATION_SERVICE_ROOT_URL=
BLOCKCHAIN_CHAINID=
BLOCKCHAIN_CHAINURL=
BLOCKCHAIN_PLSTARTINGBLOCK=
BLOCKCHAIN_EXECUTOR_BATCH_MESSAGES=
BLOCKCHAIN_PLENDPOINTADDRESS=
BLOCKCHAIN_LISTENER_BATCH_BLOCKS=
BLOCKCHAIN_STORAGE_PROOF_BATCH_MESSAGES=
# Enigma Configuration
BLOCKCHAIN_ENYGMA_PROOF_API_ADDRESS=
BLOCKCHAIN_ENYGMA_PL_EVENTS=

# CC Configuration
COMMITCHAIN_CHAINURL=
COMMITCHAIN_VERSION=
COMMITCHAIN_CHAINID=
COMMITCHAIN_CCSTARTINGBLOCK=
COMMITCHAIN_ATOMICREVERTSTARTINGBLOCK=
COMMITCHAIN_OPERATORCHAINID=
COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY=
COMMITCHAIN_CCENDPOINTMAXBATCHMESSAGES=
COMMITCHAIN_EXPIRATIONREVERTTIMEINMINUTES=

LOG_LEVEL=
LOG_HANDLER=
```

## Deployment Steps
#### Note: For any variables that you will copy from the deployment output, make sure to include both the variable names and their assigned values.

### 1. Deploy CommitChain Contracts
`npx hardhat deploy:commit-chain --network development` (for QA the network is "quality")
- Copy the address of the CC deployment proxy registry once the script is done and paste it into the `.env` file of the contracts:
```dotenv
COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY=
```    
- Copy the other printed environment variables and paste them into the `.env` files of the relayers and atomic services.:

```dotenv
COMMITCHAIN_CHAINID=
COMMITCHAIN_CCSTARTINGBLOCK=
COMMITCHAIN_ATOMICREVERTSTARTINGBLOCK=
COMMITCHAIN_OPERATORCHAINID=
COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY=
COMMITCHAIN_CCENDPOINTMAXBATCHMESSAGES=
COMMITCHAIN_EXPIRATIONREVERTTIMEINMINUTES=
```


### 2. Deploy PL A Contracts
`npx hardhat deploy:privacy-ledger --network dev_a--private-ledger A`
- Copy the endpoint address and paste it into the contracts `.env` for the particular PL:
```dotenv
NODE_A_ENDPOINT_ADDRESS=
```
- Copy the other printed environment variables and paste them into the `.env` files of the relayers and atomic services:
```dotenv
BLOCKCHAIN_PLSTARTINGBLOCK=
BLOCKCHAIN_EXECUTOR_BATCH_MESSAGES=
BLOCKCHAIN_PLENDPOINTADDRESS=
BLOCKCHAIN_LISTENER_BATCH_BLOCKS=
```

### 3. Deploy PL B Contracts
- Repeat the same steps as for PL A.

### 4. Configure environment variables (Encryption Service, Relayer, Atomic Service)
- Add the encryption service environment variables.
- Add the relayer and atomic service environment variables, ensuring that you provide values for any variables that remain unfilled.

### 5. Start Services
1. Start the encryption service for PL A first.
2. Start the relayer and wait for it to submit its data to the CC.
3. Start the atomic service.
4. Repeat the same process for PL B.

