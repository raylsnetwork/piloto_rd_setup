import { task } from 'hardhat/config';
import { Spinner } from '../../utils/spinner';

task('batchTransferErc20BatchToken', 'Batch transfer ERC20 Token')
  .addParam('pl', 'The privacy ledger of the sender e.g.: A, B, ...')
  .addParam('address', 'The address of the sender')
  .addParam('resourceId', 'The resourceId of the token to send')
  .addVariadicPositionalParam('transactions', 'The transactions to send [PL, ADDRESS, AMOUNT, ...]')
  .setAction(async (taskArgs, hre) => {
    const spinner: Spinner = new Spinner();
    spinner.start();

    const { pl, address, resourceId, transactions } = taskArgs;

    const transactionsData: {
      pl: string;
      address: string;
      amount: bigint;
    }[] = [];
    for (let i = 0; i < transactions.length;) {
      const transaction: {
        pl: string;
        address: string;
        amount: bigint;
      } = {} as any;
        
      transaction.pl = transactions[i++];
      transaction.address = transactions[i++];
      transaction.amount = BigInt(transactions[i++]);

      transactionsData.push(transaction);
    }

    const rpcUrl = process.env[`RPC_URL_NODE_${pl}`];
    const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
    const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
    const signer = wallet.connect(provider);
    
    const endpointAddress = process.env[`NODE_${pl}_ENDPOINT_ADDRESS`] as string;
    const endpoint = await hre.ethers.getContractAt('EndpointV1', endpointAddress, signer);
    const tokenAddress = await endpoint.connect(signer).resourceIdToContractAddress(resourceId);
    
    spinner.stop();
    
    if (tokenAddress == '0x0000000000000000000000000000000000000000') {
      console.log(`Token not implemented on PL ${pl}`);
      return;
    }

    const token = await hre.ethers.getContractAt('Erc20BatchTeleport', tokenAddress, signer);

    console.log('Making transactions...');
    spinner.start();

    const batchTeleportPayloadRequests = transactionsData.map((transaction) => {
      const chainId = process.env[`NODE_${transaction.pl}_CHAIN_ID`] as string;
      
      return {
        to: transaction.address,
        value: transaction.amount,
        chainId: BigInt(chainId)
      }
    });

    await token.batchTeleport(batchTeleportPayloadRequests);

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    await sleep(5000);

    spinner.stop();
    console.log('Transactions done successfully!');

    console.log('');
    console.log('Token Data:');
    console.log(`- Symbol: ${await token.symbol()}`);
    console.log(`- Name: ${await token.name()}`);
    console.log(`- Balance of ${address}: ${await token.balanceOf(address)}`);
  });
