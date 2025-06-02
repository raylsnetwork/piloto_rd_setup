import {task} from 'hardhat/config';

task('check-frozen-token', 'Checks if a token is frozen')
    .addParam("pl", "The PL to check the token on")
    .addParam("resourceId", "The resourceId of the token")
    .addParam("participant", "The participant to check if the token is frozen for")
    .addParam("replica", "The address of the TokenRegistry replica")
    .setAction(async (taskArgs, hre) => {
        const {participant, resourceId, replica} = taskArgs;
        const rpcUrl = process.env[`RPC_URL_NODE_${taskArgs.pl}`];
        const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
        const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
        const signer = wallet.connect(provider);
        const TokenRegistryReplica = await hre.ethers.getContractAt('TokenRegistryReplicaV1', replica, signer);

        console.log(await TokenRegistryReplica.getFrozenTokenForParticipant(hre.ethers.keccak256(hre.ethers.toUtf8Bytes(resourceId)), participant));

    });
