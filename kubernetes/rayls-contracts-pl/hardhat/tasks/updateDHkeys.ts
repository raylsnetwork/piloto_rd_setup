import { task } from 'hardhat/config';

// npx hardhat requestNewDHKeys --pl A --plpk "67f621c48b6c45426b1dedf660446c6be2cc88ddad59bf800fbeb4c5bea4eb25"

task('requestNewDHKeys', 'Sends a request to generate new DH keys')
  .addParam('pl', `The PL (example: "A")`)
  .addParam('plpk', `The PL's private MASTER key. From DB private_keys_pl_relayer[0]`)
  .setAction(async (taskArgs, hre) => {
    // 909632fe16cfb83e79d58caf93202228045d52db14793f249a40975ce22cde25
    const pl = taskArgs.pl;
    const plpk = taskArgs.plpk;

    const rpcUrlPl = process.env[`RPC_URL_NODE_${pl}`];
    console.log(rpcUrlPl)
    const rpcUrlCC = process.env['RPC_URL_NODE_CC'];
    const providerPl = new hre.ethers.JsonRpcProvider(rpcUrlPl);
    const providerCC = new hre.ethers.JsonRpcProvider(rpcUrlCC);

    console.log(`With RPC ${rpcUrlPl}`);
    console.log(`Requesting new DH keys for node ${pl} with plpk ${plpk}`);
    console.log(`Using CC: ${rpcUrlCC}`);
    const wallet = new hre.ethers.Wallet(plpk as string);
    const signer = wallet.connect(providerPl);
    const endpoint = await hre.ethers.getContractAt('EndpointV1', process.env[`NODE_${pl}_ENDPOINT_ADDRESS`] as string, signer);

    const blockNumber = await providerCC.getBlockNumber();
    const blockNumberPL = await providerPl.getBlockNumber();
    const receipt = await endpoint.requestNewDHKeys(blockNumber + 30);
    // Wait for the transaction to be mined
    const minedReceipt = await receipt.wait();
    console.log('Transaction mined:', minedReceipt);

    console.log('Status:', minedReceipt?.status);

    // subscribe to the event
    const filter = endpoint.filters['UpdateDHKeysRequest(uint256)'];
    const events = await endpoint.queryFilter(filter, blockNumberPL, blockNumberPL + 5);
    console.log(events);
  });
