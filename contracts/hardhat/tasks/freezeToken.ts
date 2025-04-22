import {task} from 'hardhat/config';

task('freeze-token', 'Freezes a token for a list of participants')
    .addParam("participants", "The participants to freeze the token for (comma separated)")
    .addParam("resourceId", "The resourceId of the token to freeze")
    .setAction(async (taskArgs, hre) => {
        const {participants, resourceId} = taskArgs;
        const rpcUrl = process.env['RPC_URL_NODE_CC'];
        const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
        const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
        const signer = wallet.connect(provider);
        const deploymentRegistry = await hre.ethers.getContractAt('DeploymentProxyRegistry', process.env['COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY']!, signer);
        const deployment = await deploymentRegistry.getDeployment();
        const TokenRegistry = await hre.ethers.getContractAt('TokenRegistryV1', deployment.tokenRegistryAddress, signer);

        const tx = await TokenRegistry.freezeToken(hre.ethers.keccak256(hre.ethers.toUtf8Bytes(resourceId)), participants.split(",").map(Number));
        const receipt = await tx.wait();
        if (receipt?.status === 1) {
            console.log('Token frozen');
        }

    });
