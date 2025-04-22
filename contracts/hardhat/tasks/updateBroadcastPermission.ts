import { task } from 'hardhat/config';

task('updateBroadcastPermission', 'Updates the broadcast messages permission of a participant')
  .addParam('address', 'The address of the ParticipantStorage contract')
  .addParam('chainId', 'The chainId of the participant')
  .addParam('allow', 'A boolean indicating if this participant will be allowed to broadcast')
  .setAction(async (taskArgs, hre) => {
    const { address, chainId, allow } = taskArgs;
    const provider = new hre.ethers.JsonRpcProvider(process.env[`RPC_URL_NODE_CC`]);
    const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
    const signer = wallet.connect(provider);
    const ps = await hre.ethers.getContractAt('ParticipantStorageV1', address, signer);

    const allowParticipant = allow === 'true';

    const tx = await ps.updateBroadcastMessagesPermission(Number(chainId), allowParticipant);
    const receipt = await tx.wait();
    if (receipt?.status === 1) {
      console.log(`Participant with chainId ${chainId} updated successfully!`);
    }
  });
