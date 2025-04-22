import { task } from 'hardhat/config';

export const genRanHex = (size: number) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

task('getMessages', 'Get arbitrary messages')
  .addParam("pl", "The privacy ledger identification e.g. A, B, ...")
  .addParam('address', 'The contract address')
  .setAction(async (taskArgs, hre) => {
    const pl: string = taskArgs.pl;
    const address: string = taskArgs.address;

    const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);

    const rpcUrl = process.env[`RPC_URL_NODE_${pl}`];
    const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
    const signer = new hre.ethers.NonceManager(wallet.connect(provider));

    const arbitraryMessages = await hre.ethers.getContractAt('ArbitraryMessagesBatchTeleport', address, signer);

    console.log(`Messages on PL${pl}`);
    console.log(` - Messages: ${await arbitraryMessages.getMessages()}`);
    console.log(` - Count: ${await arbitraryMessages.getMessagesCount()}`);
  });
