#!/bin/bash

set -a
source .env
set +a

setup_config(){
mkdir -p ./rayls
mkdir -p ./rayls/privacy-ledger/data ./rayls/privacy-ledger/var

cat <<EOF > ./rayls/privacy-ledger/var/genesis.json
{
    "config": {
      "chainId": $NODE_PL_CHAIN_ID,
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
        "period": 1,
        "epoch": 30000
      }
    },
    "difficulty": "1",
    "gasLimit": "45000000",
    "extradata": "0x000000000000000000000000000000000000000000000000000000000000000048074600e79d46a19d4f0f6869b4396eD244685F0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "alloc": {
      "0x48074600e79d46a19d4f0f6869b4396eD244685F": {
        "balance": "300000000000000000000000"
      },
      "0xB9910b2f7B3A796acce761c1C5bE82B701d8314C": {
        "balance": "300000000000000000000000000000000"
      },
      "0xC49f9C4bE2C0EBef191d4BACC415805A7f8bD688": {
        "balance": "300000000000000000000000000000000"
      }
    }
}
EOF

cat <<EOF > ./rayls/privacy-ledger/var/start.sh
#!/bin/sh
set -euo pipefail

if [ ! -d "/app/data/privacy-ledger" ]; then
  echo "Directory /app/data/privacy-ledger does not exist. Creating it now..."
  mkdir -p "/app/data/privacy-ledger"
  cp -r /app/clique/* /app/data/privacy-ledger
  cp /app/var/genesis.json /app/data/privacy-ledger/genesis.json
  
  echo "> Replacing env vars"
  sed -i "s/\\\$NODE_PL_CHAIN_ID}/$NODE_PL_CHAIN_ID}/g" /app/data/privacy-ledger/genesis.json
  sed -i "s/\\\${PRIVACY_LEDGER_PERIOD}/1/g" /app/data/privacy-ledger/genesis.json
  sed -i "s/\\\${PRIVACY_LEDGER_GAS_LIMIT}/45000000/g" /app/data/privacy-ledger/genesis.json
  
  echo "> Calling init"
  geth init \
  --db.engine.host "${MONGODB_CONNECTION_STRING}" \
  --db.engine.name="\${MONGODB_DATABASE}" \
  --db.engine mongodb \
  --datadir "/app/data/privacy-ledger" \
  --state.scheme=hash \
  /app/data/privacy-ledger/genesis.json

  echo "> Init successfully done"
else
  echo "Directory /app/data/privacy-ledger already exists."
fi

echo "> Calling start"
_term() { 
  echo "Caught SIGTERM signal!" 
  kill -TERM "$child" 2>/dev/null
}

trap _term SIGTERM

geth \
--db.engine.host "${MONGODB_CONNECTION_STRING}" \
--db.engine.name="\${MONGODB_DATABASE}" \
--db.engine mongodb \
--cache 4096 \
--http \
--http.vhosts='*' \
--http.addr="0.0.0.0" \
--http.api="net,web3,eth,debug,txpool,trace,admin,clique" \
--http.port 8545 \
--http.corsdomain '*' \
--ipcdisable \
--authrpc.port 8551 \
--ws \
--ws.addr="0.0.0.0" \
--ws.port 8660 \
--ws.api eth,net,web3 \
--ws.origins '*' \
--datadir "/app/data/privacy-ledger" \
--networkid "${NODE_PL_CHAIN_ID}" \
--mine \
--miner.etherbase="0x48074600e79d46a19d4f0f6869b4396eD244685F" \
--miner.gaslimit="45000000" \
--rpc.batch-request-limit=20000 \
--syncmode=full \
--snapshot=false \
--gcmode=archive \
--miner.gasprice 0 \
--port 30309 \
--nodiscover \
--unlock "0x48074600e79d46a19d4f0f6869b4396eD244685F" \
--allow-insecure-unlock \
--maxpeers 0 \
--nodiscover \
--state.scheme=hash \
--password /app/clique/password.txt 

child=$! 
wait "$child"
EOF

chmod +x ./rayls/privacy-ledger/var/start.sh

}

informative_output(){
  echo "Directories created:"
  echo "./rayls/privacy-ledger/var"
  echo "./rayls/relayer/var"
  echo ""
  
  echo "Files created:"
  echo "./rayls/privacy-ledger/var/genesis.json"
  echo "./rayls/privacy-ledger/var/start.sh"
  echo ""
  
  echo "NODE_PL_CHAIN_ID was updated in the following files:"
  echo "./rayls/privacy-ledger/var/genesis.json"
  echo "./rayls/privacy-ledger/var/start.sh"
  echo ""
  echo "Starting Privacy Ledger..."
 
}

setup_config
informative_output
