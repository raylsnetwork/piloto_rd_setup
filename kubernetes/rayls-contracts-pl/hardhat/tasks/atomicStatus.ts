// import { task } from "hardhat/config";
// // import { ethers } from "hardhat";

// // npx hardhat atomicStatus --atomic-teleport 0xf3a134Cf4c88a0E83B7fd872799E9c302CC09EB5 --shared-id 94768128-1914-11ef-b5be-924610581cbc

// task("atomicStatus", "Checks if the atomic teleport was successful")
//     .addParam("atomicTeleport", "Address of Atomic Teleport contract")
//     .addParam("sharedId", "The shared id")
//     .setAction(async (taskArgs, hre) => {
//         const rpcUrl = process.env[`RPC_URL_NODE_CC`] as string
//         const privateKey = process.env['PRIVATE_KEY_SYSTEM'] as string
//         const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
//         const AtomicTepelortAddress = taskArgs.atomicTeleport;

//         const signer = new hre.ethers.Wallet(privateKey, provider);
//         const AtomicTeleport = await hre.ethers.getContractAt("AtomicTeleport", AtomicTepelortAddress, signer);

//         const atomicTeleportStatus = await AtomicTeleport.getMessageStatus(taskArgs.sharedId);
//         console.log(`Atomic teleport mesage: ${taskArgs.sharedId}`);
//         console.log(`Atomic teleport status: ${atomicTeleportStatus}`);
//     });
    