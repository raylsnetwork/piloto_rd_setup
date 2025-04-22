import { task } from 'hardhat/config';
import { ethers } from 'hardhat';

task('approveLastTokens', 'Approve last n registered tokens from the TokenRegistry contract')
  .addParam('n', 'Number of tokens to be approved')
  .setAction(async (taskArgs, { ethers }) => {
    const commitChainRpcUrl = process.env['RPC_URL_NODE_CC'];
    const provider = new ethers.JsonRpcProvider(commitChainRpcUrl);
    const venOperatorWallet = new ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
    const signer = venOperatorWallet.connect(provider);
    const numberOfTokens = parseInt(taskArgs.n);

    // Load the Deployment Registry contract
    const deploymentRegistry = await ethers.getContractAt('DeploymentProxyRegistry', process.env['COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY']!, signer);
    const deployment = await deploymentRegistry.getDeployment();

    const TokenRegistry = await ethers.getContractAt('TokenRegistryV1', deployment.tokenRegistryAddress as string, signer);
    const tokens = await TokenRegistry.getAllTokens({ gasLimit: 5000000 });

    for (let i = tokens.length - 1; i >= tokens.length - numberOfTokens; i--) {
      let token = tokens[i];

      console.log(`Trying to approve token with name: ${token.name} and resourceId: ${token.resourceId}`);
      let tx = await TokenRegistry.updateStatus(token.resourceId, 1, { gasLimit: 5000000 });
      let receipt = await tx.wait(2);
      if (receipt?.status === 0) {
        let err = `The token "${token.name}" failed to be approved`;
        throw new Error(err);
      }
      console.log(`The token "${token.name}" got approved!`);
    }
  });
