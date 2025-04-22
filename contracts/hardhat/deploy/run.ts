import { ethers, upgrades } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("\n🚀 Running test script with deployer:", deployer.address);

    // 🔹 DEPLOY DA V1 🔹

    // 1️⃣ DEPLOY DOS CONTRATOS BASE
    console.log("📢 Deploying ParticipantManager...");
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
    console.log("📢 Deploying ParticipantManager V1 (UUPS Proxy)...");
    const ParticipantStorage = await ethers.getContractFactory("ParticipantStorage");
    const participantStorage = await upgrades.deployProxy(
        ParticipantStorage, 
        [
            deployer.address,
            participantManager.target,
            enygmaManager.target,
            broadcastManager.target
        ],
        {
            kind: 'uups',
            initializer: 'initialize(address, address, address, address)',
            unsafeAllow: ["delegatecall"]
        }
    );
    await participantStorage.waitForDeployment();
    console.log(`✅ ParticipantManager V1 deployed at: ${participantStorage.target}`);

    // 🔹 ADICIONANDO UM PARTICIPANTE 🔹
    console.log("\n📝 Adding a new participant...");
    const txAdd = await participantManager.addParticipant(1, "Alice");
    await txAdd.wait();
    console.log("✅ Participant added successfully!");

    // 🔹 CONSULTANDO O PARTICIPANTE 🔹
    console.log("\n🔍 Fetching participant before update...");
    let participant = await participantManager.getParticipant(1);
    console.log("📌 Participant Data:", participant);

    // 🔹 ATUALIZANDO O PARTICIPANTE 🔹
    console.log("\n📝 Updating participant name...");
    const txUpdate = await participantManager.updateParticipantName(1, "Alice Updated");
    await txUpdate.wait();
    console.log("✅ Participant updated successfully!");

    // 🔹 CONSULTANDO NOVAMENTE APÓS ATUALIZAÇÃO 🔹
    console.log("\n🔍 Fetching participant after update...");
    participant = await participantManager.getParticipant(1);
    console.log("📌 Updated Participant Data:", participant);

    console.log("\n📢 Upgrading ParticipantStorage to ParticipantStorageV2...");
    const ParticipantStorageV2 = await ethers.getContractFactory(
      "src/commitChain/ParticipantStorage-New/ParticipantStorageV2.sol:ParticipantStorageV2" // Caminho totalmente qualificado
    );
    const upgradedStorage = await upgrades.upgradeProxy(participantStorage.target, ParticipantStorageV2);
    await upgradedStorage.waitForDeployment();
    console.log(`✅ Upgrade to ParticipantStorageV2 completed!`);
    

    // 2️⃣ Atualiza o contrato `ParticipantManager` para `ParticipantManagerV2`
    console.log("\n📢 Upgrading ParticipantManagerV2...");
    const ParticipantManagerV2 = await ethers.getContractFactory("ParticipantManagerV2");
    const upgradedParticipantManager = await upgrades.upgradeProxy(participantManager.target, ParticipantManagerV2);
    await upgradedParticipantManager.waitForDeployment();
    console.log(`✅ ParticipantManagerV2 deployed at: ${upgradedParticipantManager.target}`);

    // 🔹 CONSULTANDO APÓS UPGRADE 🔹
    console.log("\n🔍 Fetching participant after upgrade...");
    participant = await participantStorage.getParticipant(1);
    console.log("📌 Participant Data after Upgrade:", participant);

    // 3️⃣ Atualiza o `ParticipantManager` no `ParticipantStorageV2`
    /*console.log("\n🔄 Updating ParticipantManager address in ParticipantStorage...");
    const txConfig = await participantStorage.configureParticipantManager(participantManagerV2.target);
    await txConfig.wait();
    console.log("✅ ParticipantManager address updated successfully!");*/


    // 🔹 CONSULTANDO APÓS UPGRADE 🔹
    console.log("\n🔍 Fetching participant after ParticipantManager update...");
    participant = await participantStorage.getParticipant(1);
    console.log("📌 Participant Data after Upgrade:", participant);

    // 🔹 VALIDAÇÃO FINAL 🔹
    if (participant.chainId === 0n) {
        console.error("❌ ERROR: Participant data not found after upgrade!");
        process.exit(1);
    }

    console.log("\n✅ Test Completed Successfully! 🎉");
}

// 🚀 EXECUTA O SCRIPT
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ ERROR:", error);
        process.exit(1);
    });