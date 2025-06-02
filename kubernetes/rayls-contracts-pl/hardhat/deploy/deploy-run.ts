import { ethers, upgrades } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    const owner = deployer.address;

    console.log("🚀 Deploying contracts with the account:", deployer.address);

    // 1️⃣ DEPLOY DOS CONTRATOS BASE
    console.log("📢 Deploying ParticipantManager Proxy...");
    const ParticipantManager = await ethers.getContractFactory("ParticipantManager");
    const participantManager = await upgrades.deployProxy(
        ParticipantManager, 
        [
            deployer.address,
        ],
        {
            kind: 'uups',
            initializer: 'initialize(address)'
        }
    );
    await participantManager.waitForDeployment();
    console.log(`✅ ParticipantManager deployed at: ${participantManager.target}`);

    console.log("📢 Deploying EnygmaManager...");
    const EnygmaManager = await ethers.getContractFactory("EnygmaManager");
    const enygmaManager = await EnygmaManager.deploy();
    await enygmaManager.waitForDeployment();
    console.log(`✅ EnygmaManager deployed at: ${enygmaManager.target}`);

    console.log("📢 Deploying BroadcastManager...");
    const BroadcastManager = await ethers.getContractFactory("BroadcastManager");
    const broadcastManager = await BroadcastManager.deploy();
    await broadcastManager.waitForDeployment();
    console.log(`✅ BroadcastManager deployed at: ${broadcastManager.target}`);

    // 2️⃣ DEPLOY DO PARTICIPANT STORAGE (USANDO UUPS)
    console.log("📢 Deploying ParticipantStorage (UUPS Proxy)...");
    const ParticipantStorage = await ethers.getContractFactory("ParticipantStorage");
    const participantStorage = await upgrades.deployProxy(ParticipantStorage, [
        owner,
        participantManager.target,
        enygmaManager.target,
        broadcastManager.target
    ],
    {
        kind: 'uups',
        initializer: 'initialize(address, address, address, address)',
        unsafeAllow: ["delegatecall"]
    });

    await participantStorage.waitForDeployment();
    console.log(`✅ ParticipantStorage deployed at: ${participantStorage.target}`);

    // 3️⃣ ADICIONAR UM PARTICIPANTE
    console.log("\n📝 Adding a new participant...");
    const txAddParticipant = await participantStorage.addParticipant(1, "Alice");
    console.log(`🔗 Transaction Hash (Add): ${txAddParticipant.hash}`);
    await txAddParticipant.wait();
    console.log("✅ Participant added successfully!");

    // 4️⃣ VERIFICAR O PARTICIPANTE REGISTRADO
    console.log("\n🔍 Fetching added participant...");
    let participant = await participantStorage.getParticipant(1);
    console.log("📌 Participant Data:", participant);

    // 5️⃣ ATUALIZAR O PARTICIPANTE
    console.log("\n📝 Updating participant name...");
    const txUpdateParticipant = await participantStorage.updateParticipantName(1, "Alice Updated");
    console.log(`🔗 Transaction Hash (Update): ${txUpdateParticipant.hash}`);
    await txUpdateParticipant.wait();
    console.log("✅ Participant updated successfully!");

    // 6️⃣ VERIFICAR O PARTICIPANTE ATUALIZADO
    console.log("\n🔍 Fetching updated participant...");
    participant = await participantStorage.getParticipant(1);
    console.log("📌 Updated Participant Data:", participant);

    // 7️⃣ REALIZAR O BROADCAST DOS PARTICIPANTES
    console.log("\n📡 Broadcasting participants...");
    const txBroadcast = await participantStorage.broadcastParticipants();
    console.log(`🔗 Transaction Hash (Broadcast): ${txBroadcast.hash}`);
    const receipt = await txBroadcast.wait();
    console.log("✅ Participants broadcasted successfully!");

    const storageSlot = await participantStorage.getStorageSlot();
    console.log("📌 Storage Slot being used:", storageSlot);


    console.log("\n✅ Deployment and Test Script completed successfully!");
}

// 🚀 EXECUTA O SCRIPT
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ ERROR:", error);
        process.exit(1);
    });