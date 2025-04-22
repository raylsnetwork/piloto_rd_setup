import { ethers, upgrades } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("🚀 Running upgrade script with deployer:", deployer.address);

    // Recupera o contrato proxy já implantado
    const participantStorageProxyAddress = "0x4a01a9bd1b52bE7E908937F01f4F3aAAc40122c2"; 
    console.log("🔍 Found ParticipantStorage Proxy at:", participantStorageProxyAddress);

    // 🔄 Criando instância do contrato
    // 🔗 Endereço do contrato ParticipantManager
    const participantManagerAddress = "0x8EAE5a67Def7b006E0bF279c514350731ceA4649";
    const ParticipantManager = await ethers.getContractFactory("ParticipantManager");
    const participantManager = ParticipantManager.attach(participantManagerAddress);

    // 🔹 CONSULTANDO O PARTICIPANTE 🔹
    console.log("\n🔍 Fetching participant before update...");
    let participant1 = await participantManager.getParticipant(1);
    console.log("📌 Participant Data:", participant1);

    // 2️⃣ Atualiza o contrato `ParticipantManager` para `ParticipantManagerV2`
    console.log("\n📢 Upgrading ParticipantManagerV2...");
    const ParticipantManagerV2 = await ethers.getContractFactory("ParticipantManagerV2");

    const pmv2 = await ParticipantManagerV2.deploy();
    await pmv2.waitForDeployment();

    //const upgradedParticipantManager = await upgrades.upgradeProxy(participantManager.target, ParticipantManagerV2);
    //await upgradedParticipantManager.waitForDeployment();


  // Criando a transação de atualização do contrato
    const upgradedParticipantManager = await participantManager.upgradeToAndCall(
      pmv2.target,  // Novo endereço da implementação
      "0x" // Chama `initializeV2()` (se existir)
    );

    // Aguarda a transação ser confirmada
    await upgradedParticipantManager.wait();

    console.log(`✅  Upgrade to ParticipantManagerV2 completed!`);

    // 1️⃣ Atualiza o contrato `ParticipantStorage` para `ParticipantStorageV2`
    console.log("\n📢 Upgrading ParticipantStorage to ParticipantStorageV2...");
    const ParticipantStorageV2 = await ethers.getContractFactory(
      "src/commitChain/ParticipantStorage-New/ParticipantStorageV2.sol:ParticipantStorageV2"
    );
    const upgradedStorage = await upgrades.upgradeProxy(
      participantStorageProxyAddress, 
      ParticipantStorageV2,
      {
        call: { fn: "configureParticipantManager", args: [participantManagerAddress] } // ⚠️ Chama `initializeV2()` após upgrade
    });
    await upgradedStorage.waitForDeployment();
    console.log(`✅ Upgrade to ParticipantStorageV2 completed!`);

    

    

    // 4️⃣ Valida a atualização
    console.log("\n🔍 Fetching migrated participant...");
    let participant = await upgradedStorage.getParticipant(1);
    console.log("📌 Migrated Participant Data:", participant);

    // 5️⃣ Atualiza o participante na V2
    console.log("\n📝 Updating participant name and description...");
    const txUpdate = await upgradedStorage.updateParticipant(1, "Alice V2 Updated", "New description added in V2");
    await txUpdate.wait();
    console.log("✅ Participant updated successfully!");

    // 6️⃣ Consulta o participante atualizado
    console.log("\n🔍 Fetching updated participant...");
    participant = await upgradedStorage.getParticipant(1);
    console.log("📌 Updated Participant Data:", participant);

    console.log("\n✅ Upgrade, Migration, and Update Completed Successfully!");
}

// 🚀 Executa o script
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ ERROR:", error);
        process.exit(1);
    });