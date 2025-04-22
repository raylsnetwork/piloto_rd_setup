import { task } from 'hardhat/config';
import { Spinner } from '../../utils/spinner';

task('mintErc20BatchToken', 'Mint token')
  .addParam('pl', 'The privacy ledger to mint the token in e.g.: A, B, ...')
  .addParam('address', 'The address to mint the token')
  .addParam('resourceId', 'The resourceId of the token')
  .addParam('amount', 'The amount to mint')
  .setAction(async (taskArgs, hre) => {
    const spinner: Spinner = new Spinner();
    spinner.start();

    const { pl, address, resourceId, amount } = taskArgs;

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

    console.log('Minting token...');
    spinner.start();

    await token.connect(signer).mint(address, BigInt(amount));

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    await sleep(5000);

    spinner.stop();
    console.log('Minting successful!');

    console.log('');
    console.log('Token Data:');
    console.log(`- Symbol: ${await token.symbol()}`);
    console.log(`- Name: ${await token.name()}`);
    console.log(`- Balance of ${address}: ${await token.balanceOf(address)}`);
  });
