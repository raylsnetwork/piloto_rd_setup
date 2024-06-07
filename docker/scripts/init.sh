#!/bin/bash

CHAINID="$1"
MONGODB_CONNECTION_STRING="$2"

# Check if CHAIN_ID is defined
if [ -z $CHAINID ]; then
  echo "Error: CHAINID is not defined. Please provide CHAINID as an argument. Example: make init CHAINID=xxxxxxxxxx MONGODB_CONNECTION_STRING='mongodb+srv://username:password@endpoint'"
  exit 1
fi

# Check if MONGODB_CONNECTION_STRING is defined
if [ -z $MONGODB_CONNECTION_STRING ]; then
  echo "Error: MONGODB_CONNECTION_STRING is not defined. Please provide MONGODB_CONNECTION_STRING as an argument. Example: make init CHAINID=xxxxxxxxxx MONGODB_CONNECTION_STRING='mongodb+srv://username:password@endpoint'"
  exit 1
fi

mkdir -p ./rayls/privacy-ledger/data ./rayls/privacy-ledger/var ./rayls/relayer/var

cat <<EOF > ./rayls/privacy-ledger/var/genesis.json
{
  "config": {
   "chainId": $CHAINID,
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

EOF

cat <<EOF > ./rayls/privacy-ledger/var/config.toml
[Eth]
RPCGasCap = 9000000000000

[Eth.Ethash]
DisallowBlockCreation = true
CacheDir = "ethash"
CachesInMem = 2
CachesOnDisk = 3
CachesLockMmap = false
DatasetDir = "/app/data/rayls-private-ledger/.ethash"
DatasetsInMem = 1
DatasetsOnDisk = 2
DatasetsLockMmap = false
PowMode = 0
NotifyFull = false
EOF

cat <<EOF > ./rayls/privacy-ledger/var/start.sh
#!/bin/sh

/app/raylz-private-ledger\
  --http\
  --http.vhosts="*"\
  --http.addr="0.0.0.0"\
  --http.api="net,web3,eth,debug,txpool"\
  --http.port 8545\
  --http.corsdomain="*"\
  --ipcdisable\
  --ws\
  --ws.addr="0.0.0.0"\
  --ws.port 8660\
  --ws.api eth,net,web3\
  --ws.origins="*"\
  --datadir="/app/data/rayls-private-ledger"\
  --networkid="$CHAINID"\
  --mine\
  --miner.threads=1\
  --miner.etherbase="0x1bE478ee83095aF7F21bd84743fB39B68Dd600A6"\
  --metrics\
  --pprof\
  --metrics.addr=0.0.0.0\
  --metrics.port=6080\
  --pprof.addr=0.0.0.0\
  --rpc.gascap=0\
  --gcmode="archive"\
  --syncmode=full\
  --miner.gasprice=0\
  --port=30309\
  --config=/app/var/config.toml\
  --db.engine=mongodb\
  --db.engine.host="\${MONGODB_CONN}"\
  --db.engine.name="\${MONGODB_DATABASE}"\
  /app/var/genesis.json
EOF

chmod +x ./rayls/privacy-ledger/var/start.sh

cat <<EOF > ./rayls/relayer/var/config.json
{
  "Database": {
      "ConnectionString": "\${RELAYER_DATABASE_CONNECTIONSTRING}",
      "Name": "\${RELAYER_DATABASE_NAME}",
      "Type": "\${RELAYER_DATABASE_TYPE}"
  },
  "Blockchain": {
      "ChainID": "\${RELAYER_BLOCKCHAIN_CHAINID}",
      "ChainURL": "\${RELAYER_BLOCKCHAIN_CHAINURL}",
      "ChainWSURL": "\${RELAYER_BLOCKCHAIN_CHAINWSURL}",
      "BatchSize": "\${RELAYER_BLOCKCHAIN_BATCHSIZE}",
      "PlStartingBlock": "0"
  },
  "CommitChain": {
    "ChainURL": "\${RELAYER_COMMITCHAIN_CHAINURL}",
    "ChainWSUrl": "\${RELAYER_COMMITCHAIN_CHAINWSURL}",
    "CommitChainPLStorageContract": "\${RELAYER_COMMITCHAIN_COMMITCHAINPLSTORAGECONTRACT}",
    "ParticipantStorageContract": "\${RELAYER_COMMITCHAIN_PARTICIPANTSTORAGECONTRACT}",
    "ChainId": "\${RELAYER_COMMITCHAIN_CHAINID}",
    "CcStartingBlock": "\${RELAYER_COMMITCHAIN_CCSTARTINGBLOCK}",
    "Version": "\${RELAYER_COMMITCHAIN_VERSION}",
    "AtomicTeleportContract": "\${RELAYER_COMMITCHAIN_ATOMICTELEPORTCONTRACT}",
    "ResourceRegistryContract": "\${RELAYER_COMMITCHAIN_RESOURCEREGISTRYCONTRACT}",
    "CcEndpointAddress": "\${RELAYER_COMMITCHAIN_CCENDPOINTADDRESS}",
    "BalanceCommitmentContract": "\${RELAYER_COMMITCHAIN_BALANCECOMMITMENTCONTRACT}",
    "TokenRegistryContract": "\${RELAYER_COMMITCHAIN_TOKENREGISTRYCONTRACT}",
    "OperatorChainId": "\${RELAYER_COMMITCHAIN_OPERATORCHAINID}"
  }
}
EOF

cp ./examples/docker-compose.yml.example docker-compose.yml

sed -i "s|BLOCKCHAIN_CHAIN_ID|$CHAINID|g" docker-compose.yml
sed -i "s|MONGODB_CONNECTION_STRING|$MONGODB_CONNECTION_STRING|g" docker-compose.yml

echo "Directories created:"
echo "./rayls/privacy-ledger/data"
echo "./rayls/privacy-ledger/var"
echo "./rayls/relayer/var"
echo ""

echo "Files created:"
echo "./rayls/privacy-ledger/var/genesis.json"
echo "./rayls/privacy-ledger/var/config.toml"
echo "./rayls/privacy-ledger/var/start.sh"
echo "./docker-compose.yml"
echo ""

echo "CHAINID was updated in the following files:"
echo "./rayls/privacy-ledger/var/genesis.json"
echo "./rayls/privacy-ledger/var/start.sh"
echo ""

echo "Please update the RELAYER_COMMITCHAIN variables before running the docker-compose file."