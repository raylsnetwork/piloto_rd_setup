## Summary

- Setup MongoDB
- OPTIONAL: Run Rayls PL locally
- Deploy contracts on dev
- Replace values in contracts-repo env file
- Run the services
- Interact

## Branches and repos

| Repository      | Branch            |
| --------------- | ----------------- |
| raylz-contracts | version-2.2       |
| governance-api  | version-2.2       |
| raylz-relayer   | version-2.2       |
| privacy-ledger  | tags/v1.9.0-beta1 |

## Prerequisites

- Go 1.20+
- Git
- Running MongoDB Cluster either locally or in Mongo Atlas
- NodeJS
- Postgres
- Hardhat
- Foundry

## 1. Setup MongoDB - Locally or Mongo Atlas

- Atlas: Register at <https://account.mongodb.com/account/login> and use their free tier instance
- Run locally: The below instructions are for mac. Search the same for Linux - should be very similar.

```bash
brew install mongodb-community
brew services stop mongodb-community
npm install run-rs -g
run-rs 5.0.6 --dbpath '/opt/homebrew/var/mongodb' --keep
```

Note: If you are having issues with the local database, try launch it in a containerized environmentd:

```bash
docker run -d -p 27017:27017 --name mongo-replica mongo:6.0.13-jammy \
mongod --port 27017 --replSet rs0 --dbpath /data/db --bind_ip 0.0.0.0 & \
MONGOD_PID=$!; \
sleep 10; \
mongosh --eval "while(!rs.initiate({_id: 'rs0', members: [{ _id: 0, host: 'localhost:27017' }] }).ok){ sleep(100); }"; \
mongosh --eval "while(rs.status().ok !== 1){ sleep(100); }"; \
echo "REPLICA SET ONLINE"; \
wait $MONGOD_PID;
```

# 2. Privacy Ledger(Optional)

## You can either use local setup of the source code or just connect to the dev/QA nodes

- Remote Nodes URLS - use either of these URLS in the .env file of the contracts and the relayer/gov services

```jsx
RPC_URL_NODE_A=http://parfin-privacy-ledger-01.api.blockchain-dev.parfin.aws/
RPC_URL_NODE_B=http://parfin-privacy-ledger-02.api.blockchain-dev.parfin.aws/
RPC_URL_NODE_C=http://parfin-privacy-ledger-01.api.blockchain-dev.parfin.aws/
RPC_URL_NODE_D=http://parfin-privacy-ledger-02.api.blockchain-dev.parfin.aws/
RPC_URL_NODE_CC=http://commitchain.parfin.dev:8545

RPC_URL_NODE_A=http://parfin-privacy-ledger-01.api.blockchain-qa.parfin.aws/
RPC_URL_NODE_B=http://parfin-privacy-ledger-02.api.blockchain-qa.parfin.aws/
RPC_URL_NODE_C=http://parfin-privacy-ledger-01.api.blockchain-qa.parfin.aws/
RPC_URL_NODE_D=http://parfin-privacy-ledger-02.api.blockchain-qa.parfin.aws/
RPC_URL_NODE_CC=http://commitchain-qa.parfin.corp:8545
```

## OPTIONAL: Setup Rayls Private Ledger A instance locally

This section provides instructions for setting up a node using two different consensus mechanisms: Proof-of-Work (PoW) or Proof-of-Authority (PoA).

- **Proof-of-Work (PoW):** A consensus mechanism where miners solve computational puzzles to create new blocks. This method is energy-intensive but is widely used for public blockchains.
- **Proof-of-Authority (PoA):** A consensus mechanism where a small group of trusted validators creates new blocks. PoA is efficient for private or consortium networks where validators are known entities.

Follow the steps below to configure and launch a node with either consensus type.

### Common Setup Steps

1. Clone the repository:

   ```bash
   cd ~
   git clone https://parfin@dev.azure.com/parfin/Parchain%20Private/_git/raylz-private-ledger
   cd raylz-private-ledger
   ```

Note: For Pow make sure to be on branch `v1.9.0-beta1` and for PoA `feauture/geth-poa`

2. Build the source code (Make sure you are using the same Go version set in the `go.mod`):

   ```bash
   make
   ```

3. Create a separate directory named `PrivateLedgerA` in the home directory (`~`):

   ```bash
   mkdir ~/PrivateLedgerA
   ```

### Running the Node with Proof-of-Work (PoW)

1. Inside the `~/PrivateLedgerA` directory, create a `genesis.json` file with the following content:

   ```json
   {
     "config": {
       "chainId": 12345,
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

2. Inside this directory, create a `rayls-config-a.toml` file with the following content:

   ```toml
   [Node.P2P]
   MaxPeers = 50
   NoDiscovery = true
   BootstrapNodes = []
   BootstrapNodesV5 = []
   #StaticNodes = ['enode://a472ad7b4249a298e3800f9d7996b51f9bc2e13ed90d64b813998bf17d01ba8e9dd7344d6fdd341e7d5a35c58cbcdd155a08c179e54ff850b5673274d978b78b@172.31.31.134:30310']
   TrustedNodes = []
   ListenAddr = ":30310"
   DiscAddr = ""
   EnableMsgEvents = false

   [Eth]
   RPCGasCap = 9000000000000

   [Eth.Ethash]
   DisallowBlockCreation = false
   CacheDir = "ethash"
   Difficulty = 900000
   CachesInMem = 2
   CachesOnDisk = 3
   CachesLockMmap = false
   DatasetDir = "~/.parchain/.ethash/ethashA"
   DatasetsInMem = 1
   DatasetsOnDisk = 2
   DatasetsLockMmap = false
   PowMode = 0
   NotifyFull = false
   ```

3. Start your PoW node with the following command:

   ```bash
   ~/repos/raylz-private-ledger/build/bin/parchain \
   --http \
   --http.vhosts='*' \
   --http.addr="0.0.0.0" \
   --http.api="net,web3,eth,debug,txpool" \
   --http.port 8545 \
   --authrpc.port 8551 \
   --http.corsdomain '*' \
   --ws \
   --ws.port 8660 \
   --ws.api eth,net,web3 \
   --ws.origins '*' \
   --datadir ~/PrivateLedgerA/NodeA \
   --networkid 12345 \
   --mine \
   --miner.threads=1 \
   --miner.etherbase=0x1bE478ee83095aF7F21bd84743fB39B68Dd600A6 \
   --gcmode "archive" \
   --syncmode=full \
   --miner.gasprice 0 \
   --port 30310 \
   --config ~/PrivateLedgerA/rayls-config-a.toml \
   --db.engine mongodb \
   --db.engine.host="mongodb://0.0.0.0:27017/?directConnection=true&replicaSet=rs" \
   --db.engine.name="NodeA" \
   ~/PrivateLedgerA/genesis.json
   ```

### Running the Node with Proof-of-Authority (PoA)

Note: Geth stopped supporting PoA from version 1.14 onwards, be sure to be in a compatible environment

#### Setting Up the Validator Account

1. Create a new Ethereum account:

   ```bash
   ~/repos/raylz-private-ledger/build/bin/parchain account new --datadir ~/PrivateLedgerA/NodeA
   ```

   - You will be prompted to enter a password. This password will be used to unlock the account later.
   - The command will output a new account address. Save this address as `<validator_address>`.

2. Create a `password.txt` file to store the password for the new account:

   - Inside the `~/PrivateLedgerA` directory, create a file named `password.txt` and add the password you used to create the account.
   - This file will be used to unlock the account automatically when starting the node.

#### Starting the PoA Node

hs

1. Inside the `~/PrivateLedgerA` directory, create a `genesis.json` file with the following content to include the new account with a balance:

   ```json
   {
     "config": {
       "chainId": 12345,
       "homesteadBlock": 0,
       "eip150Block": 0,
       "eip155Block": 0,
       "eip158Block": 0,
       "byzantiumBlock": 0,
       "constantinopleBlock": 0,
       "petersburgBlock": 0,
       "istanbulBlock": 0,
       "berlinBlock": 0,
       "clique": {
         "period": 15,
         "epoch": 30000
       }
     },
     "difficulty": "1",
     "gasLimit": "9000000000000",
     "alloc": {
       "<validator_address>": {
         "balance": "300000000000000000000000"
       }
     },
     "extraData": "0x0000000000000000000000000000000000000000000000000000000000000000<validator_address>000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
   }
   ```

   - Replace `<validator_address>` with the account address created in the previous step. Make sure that on the `extraData` field, you insert the address without any `0x` prefix.

2. Initialize the node with the genesis file and using MongoDB:

   ```bash
   ~/repos/raylz-private-ledger/build/bin/parchain init \
   --db.engine.host="mongodb://0.0.0.0:27017/?directConnection=true&replicaSet=rs" \
   --db.engine.name="NodeA" \
   --db.engine mongodb \
   --datadir ~/PrivateLedgerA/NodeA \
   ~/PrivateLedgerA/genesis.json
   ```

3. Start your PoA node with the following command:

   ```bash
   ~/repos/raylz-private-ledger/build/bin/parchain \
   --http \
   --http.vhosts='*' \
   --http.addr="0.0.0.0" \
   --http.api="net,web3,eth,debug,txpool" \
   --http.port 8545 \
   --authrpc.port 8551 \
   --http.corsdomain '*' \
   --ws \
   --ws.port 8660 \
   --ws.api eth,net,web3 \
   --ws.origins '*' \
   --datadir ~/PrivateLedgerA/NodeA \
   --networkid 12345 \
   --syncmode=full \
   --unlock <validator_address> \
   --password ~/PrivateLedgerA/password.txt \
   --mine \
   --miner.etherbase <validator_address> \
   --allow-insecure-unlock \
   --port 30310
   ```

   - Replace `<validator_address>` with the validator's address, which will be used as both the block sealer and reward receiver.
   - The `--password` option points to the `password.txt` file, allowing the account to be unlocked automatically.
   - The `--datadir` should point to `~/PrivateLedgerA/NodeA`. The node configuration files and data will be stored here.

Note: If you get this error

```jsx
 Failed to write block into disk
 err="(NotMaster) not master"
```

Do a rs.status() in the db (you may use mongosh) and check which member has "stateStr: 'PRIMARY'", in my case was localhost:27018, so I had to change --db.engine.host to

```
--db.engine.host="mongodb://0.0.0.0:27018/?directConnection=true&replicaSet=rs" \
```

- Your node should now be operational. To make sure that is so, execute this command.

```jsx
curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["latest", true],"id":1}' localhost:8545
```

- Example response

```jsx
{"jsonrpc":"2.0","id":1,"result":{"difficulty":"0x20000","extraData":"0xd783010b03846765746886676f312e31398664617277696e","gasLimit":"0x7f8eb74f983","gasUsed":"0x5208","hash":"0x5043c1c57267327a32f4f5d6fa168170910d053b332cb0e9455010c8e83e4a90","logsBloom":"0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","miner":"0x1be478ee83095af7f21bd84743fb39b68dd600a6","mixHash":"0xddf93b7b40b3c937a1d833c8939311f057d6ba1e8956ed6f337b853eb6a6087a","nonce":"0x464cc7b935ad7a4c","number":"0x1b","parentHash":"0xf85a633bb46dddea9038b2c85a10d87ea68770e887b4a87d476d7d0f719b6865","receiptsRoot":"0x056b23fbba480696b65fe5a59b8f2148a1299103c4f57df839233af2cf4ca2d2","sha3Uncles":"0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347","size":"0x286","stateRoot":"0xde1a3fbfebd134e74af44057cd7b3a4445a3e7a872068f37232e6f7b7b1f0ba4","timestamp":"0x657879db","totalDifficulty":"0x360001","transactions":[{"blockHash":"0x5043c1c57267327a32f4f5d6fa168170910d053b332cb0e9455010c8e83e4a90","blockNumber":"0x1b","from":"0x2c749ee40b1fd36fba375a668cd6160486878cb8","gas":"0x5208","gasPrice":"0x0","hash":"0xda32c34e71a3a300960e0b2178a6dc654d080c339dc1c30dcf9a13ade958fb13","input":"0x","nonce":"0x4","to":"0x2c749ee40b1fd36fba375a668cd6160486878cb8","transactionIndex":"0x0","value":"0x5af3107a4000","type":"0x0","chainId":"0x3039","v":"0x6096","r":"0x53b16592ead129b3189419e9d1fdefa66cfdddff03cbdb77e5bb0a9720db6fc7","s":"0x6f59290a2674d202aceedc1ef1447fccb2b9f2b6cc82d9d98eff9da7f5bee3f"}],"transactionsRoot":"0xae8cd93c3a48c1ac464f54c99ca6e38341be4d393f24d1784b5a6729e73e6964","uncles":[]}}
```

### OPTIONAL: Setup Rayls Private Ledger B instance locally

Here will only be shown the PoW setup, for PoA follow the same logic as for NodeA.

- Clone the repository and checkout v1.9.0-beta1 tag

```jsx
git clone https://parfin@dev.azure.com/parfin/Parchain%20Private/_git/raylz-private-ledger
git checkout tags/v1.9.0-beta1
```

- Build the source code

```jsx
make;
```

- Create a separate directory named PrivateLedgerB in your home (~)
- Inside this new directory create genesis1.json file with the following content

```jsx
{
  "config": {
    "chainId": 123456,
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

- Inside this new directory create rayls-config-b.toml file with the following content

```toml
[Node.P2P]
MaxPeers = 50
NoDiscovery = true
BootstrapNodes = []
BootstrapNodesV5 = []
#StaticNodes = ['enode://a472ad7b4249a298e3800f9d7996b51f9bc2e13ed90d64b813998bf17d01ba8e9dd7344d6fdd341e7d5a35c58cbcdd155a08c179e54ff850b5673274d978b78b@172.31.31.134:30310']
TrustedNodes = []
ListenAddr = ":30310"
DiscAddr = ""
EnableMsgEvents = false

[Eth]
RPCGasCap = 9000000000000

[Eth.Ethash]
DisallowBlockCreation = false
Difficulty= 900000
CacheDir = "ethash"
CachesInMem = 2
CachesOnDisk = 3
CachesLockMmap = false
DatasetDir = "~/.parchain/.ethash/ethashB"
DatasetsInMem = 1
DatasetsOnDisk = 2
DatasetsLockMmap = false
PowMode = 0
NotifyFull = false
```

- From inside the new directory, start your node with the following command:

```jsx
~/repos/raylz-private-ledger/build/bin/parchain \
--http \
--http.vhosts='*' \
--http.addr="0.0.0.0" \
--http.api="net,web3,eth,debug,txpool" \
--http.port 8546 \
--authrpc.port 8552 \
--http.corsdomain '*' \
--ws \
--ws.port 8661 \
--ws.api eth,net,web3 \
--ws.origins '*' \
--datadir NodeB \
--networkid 123456 \
--mine \
--miner.threads=1 \
--miner.etherbase=0x1bE478ee83095aF7F21bd84743fB39B68Dd600A6 \
--rpc.gascap 0 \
--gcmode "archive" \
--syncmode=full \
--miner.gasprice 0 \
--port 30311 \
--config rayls-config-b.toml \
--db.engine mongodb \
--db.engine.host="mongodb://0.0.0.0:27017/?directConnection=true&replicaSet=rs" \
--db.engine.name="NodeB" \
genesis1.json

```

- Your node should now be operational. To make sure that is so, execute this command.

```jsx
curl -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params":["latest", true],"id":1}' localhost:8545
```

- Example response

```jsx
{"jsonrpc":"2.0","id":1,"result":{"difficulty":"0x20000","extraData":"0xd783010b03846765746886676f312e31398664617277696e","gasLimit":"0x7f8eb74f983","gasUsed":"0x5208","hash":"0x5043c1c57267327a32f4f5d6fa168170910d053b332cb0e9455010c8e83e4a90","logsBloom":"0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000","miner":"0x1be478ee83095af7f21bd84743fb39b68dd600a6","mixHash":"0xddf93b7b40b3c937a1d833c8939311f057d6ba1e8956ed6f337b853eb6a6087a","nonce":"0x464cc7b935ad7a4c","number":"0x1b","parentHash":"0xf85a633bb46dddea9038b2c85a10d87ea68770e887b4a87d476d7d0f719b6865","receiptsRoot":"0x056b23fbba480696b65fe5a59b8f2148a1299103c4f57df839233af2cf4ca2d2","sha3Uncles":"0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347","size":"0x286","stateRoot":"0xde1a3fbfebd134e74af44057cd7b3a4445a3e7a872068f37232e6f7b7b1f0ba4","timestamp":"0x657879db","totalDifficulty":"0x360001","transactions":[{"blockHash":"0x5043c1c57267327a32f4f5d6fa168170910d053b332cb0e9455010c8e83e4a90","blockNumber":"0x1b","from":"0x2c749ee40b1fd36fba375a668cd6160486878cb8","gas":"0x5208","gasPrice":"0x0","hash":"0xda32c34e71a3a300960e0b2178a6dc654d080c339dc1c30dcf9a13ade958fb13","input":"0x","nonce":"0x4","to":"0x2c749ee40b1fd36fba375a668cd6160486878cb8","transactionIndex":"0x0","value":"0x5af3107a4000","type":"0x0","chainId":"0x3039","v":"0x6096","r":"0x53b16592ead129b3189419e9d1fdefa66cfdddff03cbdb77e5bb0a9720db6fc7","s":"0x6f59290a2674d202aceedc1ef1447fccb2b9f2b6cc82d9d98eff9da7f5bee3f"}],"transactionsRoot":"0xae8cd93c3a48c1ac464f54c99ca6e38341be4d393f24d1784b5a6729e73e6964","uncles":[]}}
```

## 3. Contract deployment

### After you have a running PL either locally or in the dev/QA env - we need to deploy the rayls-protocol on it

1. Clone the repository

```bash
git clone https://parfin@dev.azure.com/parfin/Parchain%20Private/_git/rayls-contracts
git checkout version-1.11
```

1. Install dependencies

```bash
npm install
npx hardhat compile
```

- Install Foundry - follow the instructions from the link below

```
https://github.com/foundry-rs
```

1. Set the correct .env file ( you can use dev as well)

```markdown
# QA .env example:

PRIVATE_KEY_SYSTEM=ac0974bec39a17e36ba4........784d7bf4f2ff80 # use your own private key

RPC_URL_NODE_A=http://parfin-privacy-ledger-01.api.blockchain-qa.parfin.aws
RPC_URL_NODE_B=http://parfin-privacy-ledger-02.api.blockchain-qa.parfin.aws
RPC_URL_NODE_C=http://parfin-privacy-ledger-03.api.blockchain-qa.parfin.aws/
RPC_URL_NODE_D=http://parfin-privacy-ledger-04.api.blockchain-qa.parfin.aws/
RPC_URL_NODE_E=http://parfin-privacy-ledger-05.api.blockchain-qa.parfin.aws/
RPC_URL_NODE_F=http://parfin-privacy-ledger-06.api.blockchain-qa.parfin.aws/

RPC_URL_NODE_CC=http://commitchain-qa.parfin.corp:8545

NODE_A_CHAIN_ID=600001
NODE_B_CHAIN_ID=600002
NODE_C_CHAIN_ID=600003
NODE_D_CHAIN_ID=600004
NODE_E_CHAIN_ID=600005
NODE_F_CHAIN_ID=600006

NODE_CC_CHAIN_ID=149402
PARTICIPANTS="600001,600002,600003,600004,600005,600006"
```

You can generate a privateKey-address pair using <https://vanity-eth.tk/>. Plug the private key in the .env and save the address somewhere.

Next, you will need to setup dhgen. Do this:

First, go to this folder:

```bash
cd ./hardhat/tasks/utils/dhgen
```

Use the go build command to compile your file. You can specify the target OS and architecture using environment variables if different from your current system. For example:

For Windows:

```bash
GOOS=windows GOARCH=amd64 go build -o dhgen.exe main.go
```

For Linux:

```bash
GOOS=linux GOARCH=amd64 go build -o dhgen main.go
```

For macOS:

```bash
GOOS=darwin GOARCH=amd64 go build -o dhgen main.go
```

Now you generated the executable file. To run in linux just use

```bash
./dhgen
```

1. Deploy contracts

`npm run deploy:commit-chain -- --network [development|quality|custom]`

ℹ️ - In case you need to manually select which participants (besides an auditor) get registered to the deploys VEN automatically, you use the `PARTICIPANTS` variable on your `.env` file as such:

```
# Registers only 2 participants:
PARTICIPANTS=600001,600002 #,600003,600004 #,600005,600006

# Or, register 6 participants:
PARTICIPANTS=600001,600002,600003,600004,600005,600006
```

- The output looks like this, SAVE IT somewhere:

```bash
###################################
# RAYLS - COMMIT CHAIN DEPLOYMENT #
###################################

🔑🔒 No DH Public Key given via env var "DH_PUBLIC" or argument "--dh-public", so a random one will be generated...
📝 Take notes of the generated DH KeyPair:
{
    "dhSecret": "2c424e043cfe3d141b345cbf350cbb2ce52101fd53f424fc5cee3c43b02f02e12d5b5250fb",
    "dhPublic": "75ce538092b52313932b0d2cda8abcae9783199114e026863a3fcf0572acd89f329e6e037130ed9d09a073ec8f51a3404ebf9738776764dc1634e3966ccb1861"
}

🚀🚀 Starting deploy of Commit Chain 🚀🚀
It can take some minutes, perfect time to bring a coffe ☕

✅ Finished deploy of CC PROXY contracts 👽

===========================================
👉👉👉👉 Relayer Configuration 👈👈👈👈
-------------------------------------------
ENV FORMAT:

RELAYER_COMMITCHAIN_CHAINID=1910
RELAYER_COMMITCHAIN_CCSTARTINGBLOCK=1440499
RELAYER_COMMITCHAIN_CCATOMICREVERTSTARTINGBLOCK=1440499
RELAYER_COMMITCHAIN_OPERATORCHAINID=999
RELAYER_COMMITCHAIN_CCENDPOINTADDRESS=0x3C46C67C069738010c096f9dDd90A7453F6807f6
RELAYER_COMMITCHAIN_PARTICIPANTSTORAGECONTRACT=0xE722cA107dB64de9c1a02c7eFc19c10D2D02348b
RELAYER_COMMITCHAIN_RESOURCEREGISTRYCONTRACT=0x2ae5388cCA0f7178781248b6DF9db782DE244674
RELAYER_COMMITCHAIN_TELEPORTCONTRACT=0x4eb7Da4EDb9d12Cc997AbE5A8CE3Af66A8f04175
RELAYER_COMMITCHAIN_TOKENREGISTRYCONTRACT=0x060B4FE09a4496403173Af729238Ce36B06D66B2

JSON FORMAT:
{
    "ParticipantStorageContract": "0xE722cA107dB64de9c1a02c7eFc19c10D2D02348b",
    "ChainId": "1910",
    "CcStartingBlock": "1440499",
    "CcAtomicRevertStartingBlock": "1440499",
    "CommitChainTeleportContract": "0x4eb7Da4EDb9d12Cc997AbE5A8CE3Af66A8f04175",
    "ResourceRegistryContract": "0x2ae5388cCA0f7178781248b6DF9db782DE244674",
    "CcEndpointAddress": "0x3C46C67C069738010c096f9dDd90A7453F6807f6",
    "TokenRegistryContract": "0x060B4FE09a4496403173Af729238Ce36B06D66B2",
    "OperatorChainId": "999"
}

===========================================
👉 Governance, Listener & Flagger Configuration 👈
-------------------------------------------
JSON FORMAT:
{
    "Teleport": "0x4eb7Da4EDb9d12Cc997AbE5A8CE3Af66A8f04175",
    "TokenRegistry": "0x060B4FE09a4496403173Af729238Ce36B06D66B2",
    "PrivateKey": "0x001020af1b1d1d4ee4902d4591855b0d3a1e4ab9e77899ce662c20ba8ca95c73",
    "ChainId": "1910",
    "DHPublic": "27104f31aaa9bfdcac378d4cd85be3229e31d8434c95c299d26e37978f5d292cc6cc333152e62eaa2076ae5ba01b0ce939f91c8d30ed5444e4fe6d2e76b2fd19",
    "DHSecret": "b22d2bc0dd11c13422f553bc3e1d1e51d0f1bd4cff40442cfb54bdc4bbddfc04d44cdb2b31",
    "StartingBlock": 1440499,
    "OperatorChainId": "999",
    "BatchSize": "20"
}
===========================================
👉 Contracts for Upgrade 👈
-------------------------------------------
RAYLS_MESSAGE_EXECUTOR_PROXY=0x3c78875eCAa2AB97248E1C51Cf51fB0c0f84c4bD
RAYLS_ENDPOINT_PROXY=0x3C46C67C069738010c096f9dDd90A7453F6807f6
RAYLS_TELEPORT_PROXY=0x4eb7Da4EDb9d12Cc997AbE5A8CE3Af66A8f04175
RAYLS_RESOURCE_REGISTRY_PROXY=0x2ae5388cCA0f7178781248b6DF9db782DE244674
RAYLS_PARTICIPANT_STORAGE_PROXY=0xE722cA107dB64de9c1a02c7eFc19c10D2D02348b
RAYLS_TOKEN_REGISTRY_PROXY=0x060B4FE09a4496403173Af729238Ce36B06D66B2
```

1. After deployment add this TokenRegistry address to your .env file

```bash
"TokenRegistry": "0x47330D2fe6F75899597C14d615003Ef561B01B14"
# ... rest of your variables

(Replace with the TokenRegistry from the output)
```

## 4. Encryption service, Relayer and Atomic Service

## After we have PL, CC and Contracts deployed on them, now we need to spin up the Encryption service, the Relayer and the Atomic service stack to enable the cross chain transfers

0. Bindings compilations
   ℹ️ - In the case that we need to test a contract change that integrates with the relayer or the governance-api:

- We run `npm run bindings:generate` - to generate the updated bindings for the contracts
- Then we can run `npm run bindings:move -- /path/to/relayerOrGovernance/contracts`, to move the updated bindings to the appropriate `contracts` folder on the consuming project.

1. Relayer setup

- Clone the repo and compile it

```jsx
git clone https://dev.azure.com/parfin/Parchain%20Private/_git/raylz-relayer
git checkout version-2.2
make
```

- Create two .env files inside the relayer-app folder
- For MongoDB connection, use the free MongoDB Atlas service or local one if you have set it up. The connection string format is:
  `"mongodb+srv://<YOUR_USERNAME>[:xx@cluster1.0pkxm3f.mongodb.net](mailto::xx@cluster1.0pkxm3f.mongodb.net)"`

Run the Encryption service:

- For the encryption service, you will need to have the AWS credentials set up on your machine.
- The sections bellow describe the configuration file in more detail as well as give the steps for configuring the AWS CLI locally and generating Master Keys if needed.

#### AWS CLI Setup and Master Key generation.e

For the local setup you'll need keys for an AWS user with permissions to generate KMS keys. First you need to install and setup you AWS CLI. You can refer to [this link](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) for installation instructions. After you have finished with the installation you must call `aws configure` and enter your security credentials (Access Key ID and Secret Key) as well as your region.

To use the KOS you'll need to have an AWS KMS Master Key. AWS Master Keys can be reused in local settings for the KOS service. In case a new key is needed the following command can be used to generate it.

```
aws kms create-key --description "Description of the intended use of the key" --key-usage ENCRYPT_DECRYPT --origin AWS_KMS
```

The output of the command should look like this:

```
{
    "KeyMetadata": {
        "AWSAccountId": "795583021371",
        "KeyId": "00921a9f-5f30-485e-93d8-afe21f61692c",
        "Arn": "arn:aws:kms:eu-north-1:795583021371:key/00921a9f-5f30-485e-93d8-afe21f61692c",
        "CreationDate": "2024-11-04T15:13:12.817000+02:00",
        "Enabled": true,
        "Description": "One more KMS Master key",
        "KeyUsage": "ENCRYPT_DECRYPT",
        "KeyState": "Enabled",
        "Origin": "AWS_KMS",
        "KeyManager": "CUSTOMER",
        "CustomerMasterKeySpec": "SYMMETRIC_DEFAULT",
        "KeySpec": "SYMMETRIC_DEFAULT",
        "EncryptionAlgorithms": [
            "SYMMETRIC_DEFAULT"
        ],
        "MultiRegion": false
    }
}
```

The Master Key can be found in the `KeyID` field. After acquiring the Master Key you can add it to your config in the `AWSKeyID` field in the configuration of the KOS.

- Copy the following configurations, replacing the MongoDB connection and empty "CommitChain" variables with your deployment details

**.a.env**

```
# Blockchain Configuration
BLOCKCHAIN_DATABASE_TYPE=mongodb
BLOCKCHAIN_DATABASE_NAME=relayerA
BLOCKCHAIN_DATABASE_CONNECTIONSTRING=mongodb+srv://user:pass@cluster0.swz8gvv.mongodb.net
BLOCKCHAIN_CHAINID=12345
BLOCKCHAIN_CHAINURL=http://127.0.0.1:8545
BLOCKCHAIN_PLSTARTINGBLOCK=
BLOCKCHAIN_PLENDPOINTADDRESS=
BLOCKCHAIN_LISTENER_BATCH_BLOCKS=50
BLOCKCHAIN_EXECUTOR_BATCH_MESSAGES=500
BLOCKCHAIN_DHPUBLIC=
BLOCKCHAIN_KMS_API_KEY=*
BLOCKCHAIN_KMS_SECRET=a random secret
BLOCKCHAIN_KMS_OPERATION_SERVICE_ROOT_URL=http://localhost:8080

# CommitChain Configuration
COMMITCHAIN_CHAINURL=http://commitchain.parfin.dev:8545
COMMITCHAIN_ATOMICTELEPORTCONTRACT=0x04bE39d15Dd6b2EDBA25Bee32Bb9bed80E82438C
COMMITCHAIN_PARTICIPANTSTORAGECONTRACT=0xa383489cCa146Fe32c3cA8F8CF8BF685fa2ABA39
COMMITCHAIN_CHAINID=1910
COMMITCHAIN_CCSTARTINGBLOCK=1844570
COMMITCHAIN_ATOMICREVERTSTARTINGBLOCK=1844570
COMMITCHAIN_VERSION=2.0
COMMITCHAIN_RESOURCEREGISTRYCONTRACT=0x7671fb1e887f41Fa9a1440e083ca808554aA33Cd
COMMITCHAIN_CCENDPOINTADDRESS=0x30CC9c2d0fFea947A3eC67c56db1e13476571E18
COMMITCHAIN_CCENDPOINTMAXBATCHMESSAGES=500
COMMITCHAIN_TOKENREGISTRYCONTRACT=0xdED878adFd5E9e51726ccE70435dAb052e56181F
COMMITCHAIN_OPERATORCHAINID=999
COMMITCHAIN_EXPIRATIONREVERTTIMEINMINUTES=30
COMMITCHAIN_PROOFSCONTRACT=0xeCc703E347d8B27dF192204Db144D5028197CdA5

# KMS Configuration
KMS_DATABASE_NAME=relayerAKms
BLOCKCHAIN_DATABASE_CONNECTIONSTRING=mongodb+srv://user:pass@cluster0.swz8gvv.mongodb.net
KMS_AWSKEYID=aws-key-id
KMS_CORSDOMAIN=*
KMS_API_KEY=*
KMS_SECRET=a random secret

# Logger Configuration
LOG_LEVEL=Debug
LOG_HANDLER=Text
```

**.b.env**

```
# Blockchain Configuration
BLOCKCHAIN_DATABASE_TYPE=mongodb
BLOCKCHAIN_DATABASE_NAME=relayerB
BLOCKCHAIN_DATABASE_CONNECTIONSTRING=mongodb+srv://user:pass@cluster0.swz8gvv.mongodb.net
BLOCKCHAIN_CHAINID=12345
BLOCKCHAIN_CHAINURL=http://127.0.0.1:8546
BLOCKCHAIN_PLSTARTINGBLOCK=
BLOCKCHAIN_PLENDPOINTADDRESS=
BLOCKCHAIN_LISTENER_BATCH_BLOCKS=50
BLOCKCHAIN_EXECUTOR_BATCH_MESSAGES=500
BLOCKCHAIN_DHPUBLIC=
BLOCKCHAIN_KMS_API_KEY=*
BLOCKCHAIN_KMS_SECRET=a random secret
BLOCKCHAIN_KMS_OPERATION_SERVICE_ROOT_URL=http://localhost:8081

# CommitChain Configuration
COMMITCHAIN_CHAINURL=http://commitchain.parfin.dev:8545
COMMITCHAIN_ATOMICTELEPORTCONTRACT=0x04bE39d15Dd6b2EDBA25Bee32Bb9bed80E82438C
COMMITCHAIN_PARTICIPANTSTORAGECONTRACT=0xa383489cCa146Fe32c3cA8F8CF8BF685fa2ABA39
COMMITCHAIN_CHAINID=1910
COMMITCHAIN_CCSTARTINGBLOCK=1844570
COMMITCHAIN_ATOMICREVERTSTARTINGBLOCK=1844570
COMMITCHAIN_VERSION=2.0
COMMITCHAIN_RESOURCEREGISTRYCONTRACT=0x7671fb1e887f41Fa9a1440e083ca808554aA33Cd
COMMITCHAIN_CCENDPOINTADDRESS=0x30CC9c2d0fFea947A3eC67c56db1e13476571E18
COMMITCHAIN_CCENDPOINTMAXBATCHMESSAGES=500
COMMITCHAIN_TOKENREGISTRYCONTRACT=0xdED878adFd5E9e51726ccE70435dAb052e56181F
COMMITCHAIN_OPERATORCHAINID=999
COMMITCHAIN_EXPIRATIONREVERTTIMEINMINUTES=30
COMMITCHAIN_PROOFSCONTRACT=0xeCc703E347d8B27dF192204Db144D5028197CdA5

# KMS Configuration
KMS_DATABASE_NAME=relayerAKms
BLOCKCHAIN_DATABASE_CONNECTIONSTRING=mongodb+srv://user:pass@cluster0.swz8gvv.mongodb.net
KMS_AWSKEYID=aws-key-id
KMS_CORSDOMAIN=*
KMS_API_KEY=*
KMS_SECRET=a random secret

# Logger Configuration
LOG_LEVEL=Debug
LOG_HANDLER=Text
```

- Run the Encryption service:

  To build it execute the Makefile rule:

```
make build-kos
```

After that the Encryption service can be run by issuing the command:

```
key-operation-service run --env [path-to-env-file] --port [port]
```

- Build the relayer with `make` command

```bash
cd /Users/stan/Documents/parfin/raylz-relayer
make
```

- Run the relayers

```markdown
- Relayer A
  cd /Users/stan/Documents/parfin/raylz-relayer
  ./build/relayer-app run --env ./.a.env
```

```markdown
- Relayer B
  cd /Users/stan/Documents/parfin/raylz-relayer
  ./build/relayer-app run --env ./.b.env
```

- On the first run the relayers will deploy contracts. You will need to get the endpoint address from the logs.

```markdown
[14:06:50 2024-09-13] INFO: 📝 Endpoint Address from Private Ledger | ADDRESS=0x28F28931F3d74bfA42eF19bfdbC345d1a42953Fd
```

- Continue filling the .env file in the `contracts` repo

```markdown
# ... rest of your variables

TOKEN_REGISTRY_ADDRESS=0x47330D2fe6F75899597C14d615003Ef561B01B14
NODE_A_ENDPOINT_ADDRESS=0x28F28931F3d74bfA42eF19bfdbC345d1a42953Fd # from the logs of relayer A
NODE_B_ENDPOINT_ADDRESS=0x432d..... # from the logs of relayer B
```

- Now you can start the `atomic-services`, these will verify transactions and their state, the relayers just transmit information.

```markdown
- RelayerA
  cd /Users/stan/Documents/parfin/raylz-relayer

./build/atomic_service_app run --config ./relayer-app/config-a.json
```

```markdown
- RelayerB
  cd /Users/stan/Documents/parfin/raylz-relayer

./build/atomic_service_app run --config ./relayer-app/config-b.json
```

- Now the relayer should be fully running. We can deploy a token or directly run the e2e tests.
- To deploy a token you can use the deployToken command from the contracts repo.

```markdown
npx hardhat deployToken --pl A --symbol QA
```

This deploys a token in PL A. The deployed token is an instance of `TokenExample` (see TokenExample.sol in folder test-contracts and deployToken.ts in hardhat/tasks). This token has a mint function in the constructor,

```javascript
_mint(msg.sender, 2000000);
```

so the address that corresponds the private key in the .env, `PRIVATE_KEY_SYSTEM=76c1658f71d3feda...f1ba93b4`, will receive 2000000 tokens. Let's define that address as `ADDRESS_SYSTEM=0x14...C0A9d9Aec5`.

- Logs like this should appear:

```markdown
Deploying token on A...
Token Deployed At Address 0x3b25915124503A00C548643608EEb2167E8f4C12
Token Registration Submitted, wait until relayer retrieves the generated resource

To check if it's registered, please use the following command:
$ npx hardhat checkTokenResourceId --pl A --token-address 0x3b25915124503A00C548643608EEb2167E8f4C12
```

- The relayer will pick up the event and register the token on the CC. (you can check the logs of the relayer)

After running the command

```bash
npx hardhat checkTokenResourceId --pl A --token-address 0x3b25915124503A00C548643608EEb2167E8f4C12
```

You should get something like this

```markdown
Checking token information...
No resource id generated! Wait until Ven Operator approves the token. If so, check if relayer is working properly
```

- Now after relayer registers the token we need to `approve` the token on the CC

```bash
npx hardhat approveAllTokens
```

- The logs should look like this:

```bash
The token "Token 578c92" (QA) got approved!
```

- Now copy the command from the console that checks the token id and run it

```bash
npx hardhat checkTokenResourceId --pl A --token-address 0x3b25915124503A00C548643608EEb2167E8f4C12
```

- You will get a log like this. Again, add it to your .env file

```markdown
TOKEN_QA_RESOURCE_ID=0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563
```

- Now you will have the full .env file from the `contracts` repo. Should look like this:

```bash
# QA .env example:
PRIVATE_KEY_SYSTEM=ac0974bec39a17e36ba4........784d7bf4f2ff80 # use your own private key

RPC_URL_NODE_A=http://parfin-privacy-ledger-01.api.blockchain-qa.parfin.aws
RPC_URL_NODE_B=http://parfin-privacy-ledger-02.api.blockchain-qa.parfin.aws
RPC_URL_NODE_C=http://parfin-privacy-ledger-03.api.blockchain-qa.parfin.aws/
RPC_URL_NODE_D=http://parfin-privacy-ledger-04.api.blockchain-qa.parfin.aws/
RPC_URL_NODE_E=http://parfin-privacy-ledger-05.api.blockchain-qa.parfin.aws/
RPC_URL_NODE_F=http://parfin-privacy-ledger-06.api.blockchain-qa.parfin.aws/

RPC_URL_NODE_CC=http://commitchain-qa.parfin.corp:8545

NODE_A_CHAIN_ID=600001
NODE_B_CHAIN_ID=600002
NODE_C_CHAIN_ID=600003
NODE_D_CHAIN_ID=600004
NODE_E_CHAIN_ID=600005
NODE_F_CHAIN_ID=600006

NODE_CC_CHAIN_ID=149402
PARTICIPANTS="600001,600002,600003,600004,600005,600006"

TOKEN_REGISTRY_ADDRESS=0x47330D2fe6F75899597C14d615003Ef561B01B14 # from the logs of the contracts deployment
NODE_A_ENDPOINT_ADDRESS=0x28F28931F3d74bfA42eF19bfdbC345d1a42953Fd # from the logs of relayer A
NODE_B_ENDPOINT_ADDRESS=0x432d..... # from the logs of relayer B
TOKEN_QA_RESOURCE_ID=0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563 # from the logs of command checkTokenResourceId
```

## **5. Running the governance-api stack(API,LIstener,Flagger) :**

- You need to have a running POSTGRES instance. First get the governance-api repo

```bash
git clone https://parfin@dev.azure.com/parfin/Parchain%20Private/_git/governance-api
git checkout version-1.11.0
```

- Now lets start the Listener and Flagger. Optionally you can start the API in the same way. Execute the `make` command in the `governance-api` repo. The governance uses `postgresql` as DB. Create your config files config-a.json and config-b.json inside the folder config, by copying the missing values from the `contracts` deployment

```json
{
  "Database": {
    "Type": "postgresql",
    "ConnectionString": "host=localhost user=postgres password=123 dbname=govapi_local port=5432"
  },
  "CommitChain": {
    "URL": "http://commitchain-qa.parfin.corp:8545",

    "ParticipantStorageContract": "",
    "Teleport": "",
    "TokenRegistry": "",
    "PrivateKey": "",
    "ChainId": "",
    "DHPublic": "",
    "DHSecret": "",
    "StartingBlock": 0,
    "OperatorChainId": "",
    "BatchSize": ""
  },
  "JWTSecret": "casa8fa97dsaasd89ady19238jadsd0apdj128931",
  "Logging": "development"
}
```

- Run the binaries

```bash
cd /Users/stan/Documents/parfin/governance-api/
go run cmd/flagger/main.go run --config /Users/stan/Documents/parfin/governance-api/config/config-a.json
```

```bash
cd /Users/stan/Documents/parfin/governance-api/
go run cmd/api/main.go run --config /Users/stan/Documents/parfin/governance-api/config/config-a.json
```

```bash
cd /Users/stan/Documents/parfin/governance-api/
go run cmd/listener/main.go run --config /Users/stan/Documents/parfin/governance-api/config/config-a.json
```

- All done!

## Checking balances and sending tokens

Let's define these variables

TEST_DESTINATION_ADDRESS=0xf9260C378ea6E428A79EAfe443BD24EA09Af8Bc9

ADDRESS_SYSTEM - the address that corresponds the private key in the .env, `PRIVATE_KEY_SYSTEM=76c1658f71d3feda...f1ba93b4`.

ENDPOINT*ADDRESS* A - the value stored in the .env as `NODE_A_ENDPOINT_ADDRESS=0x9EC037f...aFC17604ede41435`

ENDPOINT_ADDRESS_B - the value stored in the .env as `NODE_B_ENDPOINT_ADDRESS=0x2ba91DBE...C6D193c44045149`

YOUR_TOKEN_ID - the value stored in the .env as `TOKEN_QA_RESOURCE_ID=0x405787fa12a8...1fa75cd3aa3bb5ace`

First check that you have the 200000 tokens in ADDRESS_SYSTEM in PL A

```bash
npx hardhat tokenDataAndBalance --private-ledger A --endpoint-address __ENDPOINT_ADDRESS__A__ --address-to-check __ADDRESS_SYSTEM__ --resource-id __YOUR_TOKEN_ID__
```

The output should be something like:

```bash
Checking resource...
Found Implemented on PL A at Address 0xd735df91C7EDC96aC0bFbfFA9947D38d0076B012

Token Data:
- Symbol: QA
- Name: Token 51e926
- Balance of 0x1461650A94ac0F5c5aE24Ac4AE7934C0A9d9Aec5: 2000000
```

Now send 2 tokens from that address in PL A to the TEST_DESTINATION_ADDRESS in PL B

```bash
npx hardhat sendToken --pl-origin A --pl-dest B --token QA --destination-address __TEST_DESTINATION_ADDRESS__ --amount 2
```

Check balances

```bash
npx hardhat tokenDataAndBalance --private-ledger A --endpoint-address __ENDPOINT_ADDRESS__A__ --address-to-check __ADDRESS_SYSTEM__ --resource-id __YOUR_TOKEN_ID__
```

The output should be something like:

```bash
Checking resource...
Found Implemented on PL A at Address 0xd735df91C7EDC96aC0bFbfFA9947D38d0076B012

Token Data:
- Symbol: QA
- Name: Token 51e926
- Balance of 0x1461650A94ac0F5c5aE24Ac4AE7934C0A9d9Aec5: 1999998
```

As for PL B

```bash
npx hardhat tokenDataAndBalance --private-ledger B --endpoint-address __ENDPOINT__ADDRESS__B__ --address-to-check __TEST_DESTINATION_ADDRESS__ --resource-id __YOUR_TOKEN_ID__
```

The output should be something like:

```bash
Checking resource...
Found Implemented on PL B at Address 0x7F716769E2E59ebFdD545c94caf00068be0814Ab

Token Data:
- Symbol: QA
- Name: Token 51e926
- Balance of 0xf9260C378ea6E428A79EAfe443BD24EA09Af8Bc9: 2
```

Test the revert transaction using this destination address `0x0000000000000000000555000000000000001123`

```bash
npx hardhat sendToken --pl-origin A --pl-dest B --token QA --destination-address 0x0000000000000000000555000000000000001123 --amount 2
```

The expect output should be:

```bash
Checking resource...
Found Implemented on PL B at Address 0x7F716769E2E59ebFdD545c94caf00068be0814Ab

Token Data:
- Symbol: QA
- Name: Token 51e926
- Balance of 0x0000000000000000000555000000000000001123: 0
```

As this address is especially defined in `TokenExample.sol` as the address that reverts transactions.
