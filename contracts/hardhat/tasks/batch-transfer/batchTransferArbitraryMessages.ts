import { task } from 'hardhat/config';
import { Spinner } from '../../utils/spinner';

export const genRanHex = (size: number) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

task('batchTransferArbitraryMessages', 'Batch transfer arbitrary messages')
  .addVariadicPositionalParam('messages', 'The messages to send [message1, message2, ...]')
  .setAction(async (taskArgs, hre) => {
    const spinner: Spinner = new Spinner();

    const messages: string[] = taskArgs.messages;

    const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);

    const rpcUrlPlA = process.env[`RPC_URL_NODE_A`];
    const providerPlA = new hre.ethers.JsonRpcProvider(rpcUrlPlA);
    const signerPlA = new hre.ethers.NonceManager(wallet.connect(providerPlA));

    const rpcUrlPlB = process.env[`RPC_URL_NODE_B`];
    const providerPlB = new hre.ethers.JsonRpcProvider(rpcUrlPlB);
    const signerPlB = new hre.ethers.NonceManager(wallet.connect(providerPlB));

    const endpointAddressPlA = process.env[`NODE_A_ENDPOINT_ADDRESS`] as string;
    const endpointAddressPlB = process.env[`NODE_B_ENDPOINT_ADDRESS`] as string;

    const resourceIdPlA = `0x${genRanHex(64)}`;
    const resourceIdPlB = `0x${genRanHex(64)}`;

    const chainIdPlA = process.env[`NODE_A_CHAIN_ID`] as string;
    const chainIdPlB = process.env[`NODE_B_CHAIN_ID`] as string;

    console.log('Deploying contract on PLA');

    spinner.start();

    const arbitraryMessagesContractPlA = await hre.ethers.getContractFactory('ArbitraryMessagesBatchTeleport', signerPlA);
    const arbitraryMessagesPlA = await arbitraryMessagesContractPlA.deploy(resourceIdPlA, endpointAddressPlA);
    await arbitraryMessagesPlA.waitForDeployment();

    spinner.stop();

    console.log('Contract Address on PLA');
    console.log(await arbitraryMessagesPlA.getAddress());
    console.log('');

    console.log('Deploying contract on PLB');

    spinner.start();

    const arbitraryMessagesContractPlB = await hre.ethers.getContractFactory('ArbitraryMessagesBatchTeleport', signerPlB);
    const arbitraryMessagesPlB = await arbitraryMessagesContractPlB.deploy(resourceIdPlB, endpointAddressPlB);
    await arbitraryMessagesPlB.waitForDeployment();

    spinner.stop();

    console.log('Contract Address on PLB');
    console.log(await arbitraryMessagesPlB.getAddress());
    console.log('');

    console.log('Messages to be sent');
    console.log(messages);
    console.log('');

    console.log('Messages on PLA');
    console.log(await arbitraryMessagesPlA.getMessages());
    console.log('');

    console.log('Messages on PLB');
    console.log(await arbitraryMessagesPlB.getMessages());
    console.log('');

    console.log('Sending messages from PLA to PLB...');

    spinner.start();

    const batchTeleportPayloadRequests = messages.map((message) => ({
      resourceId: resourceIdPlB,
      message: message,
      chainId: chainIdPlB
    }));

    await arbitraryMessagesPlA.connect(signerPlA).batchTeleport(batchTeleportPayloadRequests);

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    await sleep(15000);

    spinner.stop();

    console.log('Messages sent successfully!');
    console.log('');

    console.log('Messages on PLB');
    console.log(` - Messages: ${await arbitraryMessagesPlB.getMessages()}`);
    console.log(` - Count: ${await arbitraryMessagesPlB.getMessagesCount()}`);
  });
