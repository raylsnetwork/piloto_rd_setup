import { task } from 'hardhat/config';
import { getTokenBySymbol } from './checkTokenAllChains';
// import { ethers } from 'hardhat';
//import abi from '../../artifacts/src/commitChain/TokenRegistry.sol/TokenRegistry.json';

export const genRanHex = (size: number) => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

task('interactLocal', 'Deploys token on the PL and approves it in CC')
  .addParam('from', 'The source PL (ex: A, B, C, D, BACEN, TREASURY)')
  .addParam('to', 'The destination PL (ex: A, B, C, D, BACEN, TREASURY)')
  .addParam('name', 'Token Name')
  .addParam('symbol', 'symbol')
  .addParam('vpk', 'ven operator private key')
  .addParam('address', 'destination address')
  .setAction(async (taskArgs, hre) => {
    await hre.run('compile');

    // Deploy token on the PL
    console.log(`Deploying token on ${taskArgs.from}...`);

    const randString = genRanHex(6);
    taskArgs.name = taskArgs.name || `Token ${randString}`;
    taskArgs.symbol = taskArgs.symbol || `T_${randString}`;
    const rpcUrl = process.env[`RPC_URL_NODE_${taskArgs.from}`];
    const providerPL = new hre.ethers.JsonRpcProvider(rpcUrl);
    const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
    const signerPL = new hre.ethers.NonceManager(wallet.connect(providerPL));

    const token = await hre.ethers.getContractFactory('TokenExample', signerPL);

    const tokenPL = await token.connect(signerPL).deploy(taskArgs.name, taskArgs.symbol, process.env[`NODE_${taskArgs.from}_ENDPOINT_ADDRESS`] as string, { gasLimit: 5000000 });

    // Register token in the CC
    console.log('Registering token in the CC...');
    const registerTx = await tokenPL.submitTokenRegistration(0);
    const registerReceipt = await registerTx.wait();
    if (registerReceipt === null || registerReceipt.status === 0) {
      console.log('Registration failed');
      return;
    }

    // Wait until token is registered in the CC
    const commitChainRpcUrl = process.env['RPC_URL_NODE_CC'];
    const providerCC = new hre.ethers.JsonRpcProvider(commitChainRpcUrl);
    const venOperatorWallet = new hre.ethers.Wallet(taskArgs.vpk);
    const signerCC = venOperatorWallet.connect(providerCC);

    // Load the Deployment Registry contract
    const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env['COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY']!, signerCC);
    const deployment = await deploymentRegistry.getDeployment();
    const TokenRegistry = await hre.ethers.getContractAt('TokenRegistryV1', deployment.tokenRegistryAddress, signerCC);

    const filter = TokenRegistry.filters.Erc20TokenRegistered(deployment.tokenRegistryAddress);

    let tokenRegistered = false;
    let resourceId = '';
    while (!tokenRegistered) {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      const latestCCBlock = await providerCC.getBlockNumber();
      console.log(`Latest CC block: ${latestCCBlock}`);
      const events = await TokenRegistry.queryFilter(filter, latestCCBlock - 5, latestCCBlock);
      events.forEach((e: any) => {
        if (e.args.name === taskArgs.name) {
          console.log('Token registered in CC');
          resourceId = e.args.resourceId;
          tokenRegistered = true;
        }
      });
    }

    // Аpprove the token
    console.log('Approving token in the CC...');
    const approveTx = await TokenRegistry.updateStatus(resourceId, 1, { gasLimit: 5000000 });
    const approveReceipt = await approveTx.wait();
    if (approveReceipt === null || approveReceipt.status === 0) {
      console.log('Approval failed');
      return;
    }
    let tokenApproved = false;
    while (!tokenApproved) {
      await new Promise((resolve) => setTimeout(resolve, 10000));

      const resourceIdInContract = await tokenPL.resourceId();
      if (resourceIdInContract === resourceId) {
        console.log('Token approved in CC');
        tokenApproved = true;
      }
    }

    console.log('Resource ID: ', resourceId);

    const erc20 = await hre.ethers.getContractAt('TokenExample', await tokenPL.getAddress(), signerPL);

    const tx = await erc20.teleportAtomic(taskArgs.address, '1', process.env[`NODE_${taskArgs.to}_CHAIN_ID`] as string);

    let receipt = await tx.wait(2);
    if (receipt?.status === 0) {
      // let err = `The token "${erc20.name}" (${erc20.symbol}) failed to be approved`;
      console.log('An error occurred');
    }

    // Check balances
    await hre.run('tokenDataAndBalance', {
      privateLedger: taskArgs.from,
      endpointAddress: process.env[`NODE_${taskArgs.from}_ENDPOINT_ADDRESS`],
      addressToCheck: taskArgs.address,
      resourceId
    });

    await new Promise((resolve) => setTimeout(resolve, 120000));

    await hre.run('tokenDataAndBalance', {
      privateLedger: taskArgs.to,
      endpointAddress: process.env[`NODE_${taskArgs.to}_ENDPOINT_ADDRESS`],
      addressToCheck: taskArgs.address,
      resourceId
    });
  });
