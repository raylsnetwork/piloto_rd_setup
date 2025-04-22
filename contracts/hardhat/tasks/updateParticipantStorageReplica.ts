import { task } from 'hardhat/config';

task('updateParticipantStorageReplica', 'Request participants from the Commit Chain to be synced into this PL')
  .addParam('pl', 'PL identifier (for getting the RPC URL)')
  .addParam('storageReplicaAddress', 'Address of the ParticipantStorageReplicaV1 on the PL')
  .setAction(async (taskArgs, { ethers }) => {
    const plRpcUrl = process.env['RPC_URL_NODE_' + taskArgs.pl] as string;
    const privateKey = process.env['PRIVATE_KEY_SYSTEM'] as string;
    const plSigner = new ethers.Wallet(privateKey, new ethers.JsonRpcProvider(plRpcUrl));
    const replica = await ethers.getContractAt('ParticipantStorageReplicaV1', taskArgs.storageReplicaAddress, plSigner);

    const before = await replica.getAllParticipants();
    console.log(`Before sync: ${before.length} participants.`);

    const tx = await replica.requestAllParticipantsDataFromCommitChain();
    console.log(`Request transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log('Request confirmed. Waiting 60 seconds for sync...');

    await new Promise((resolve) => setTimeout(resolve, 60000));

    const after = await replica.getAllParticipants();
    console.log(`After sync: ${after.length} participants.`);

    if (after.length > before.length) {
      console.log(`✔ Sync successful! ${after.length - before.length} new participants added.`);
    } else if (after.length === before.length) {
      console.warn('⚠ No new participants detected. Data may already have been synced or is still in transit.');
    } else {
      console.error('❌ Unexpected issue: participant count decreased.');
    }
  });
