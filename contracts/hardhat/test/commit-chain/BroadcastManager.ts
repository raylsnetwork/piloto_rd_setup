import { expect } from "chai";
import { ethers } from "hardhat";

describe("BroadcastManager", function () {
    let broadcastManager: any;
    let participantManager: any;

    beforeEach(async function () {
        const BroadcastManager = await ethers.getContractFactory("BroadcastManager");
        const ParticipantManager = await ethers.getContractFactory("ParticipantManager");

        // Implanta o ParticipantManager
        participantManager = await ParticipantManager.deploy();
        await participantManager.waitForDeployment();
        console.log(`ParticipantManager deployed at: ${participantManager.target}`);

        // Implanta o BroadcastManager
        broadcastManager = await BroadcastManager.deploy();
        await broadcastManager.waitForDeployment();
        console.log(`BroadcastManager deployed at: ${broadcastManager.target}`);

        // Configura registros iniciais no BroadcastManager
        await broadcastManager.setParticipantManager(participantManager.target);
    });

    it("Should broadcast participants", async function () {
        // Adiciona participantes
        await participantManager.addParticipant(1, "Alice");
        await participantManager.addParticipant(2, "Bob");

        // Transmite os participantes
        const participants = await broadcastManager.broadcastParticipants();

        // Converte valores retornados para um formato adequado
        const participantNames = participants.map((p: any) => p.name);
        expect(participantNames).to.include("Alice");
        expect(participantNames).to.include("Bob");
    });

    it("Should broadcast Enygma data", async function () {
        const EnygmaManager = await ethers.getContractFactory("EnygmaManager");
        const enygmaManager = await EnygmaManager.deploy();
        await enygmaManager.waitForDeployment();

        // Configura o EnygmaManager no BroadcastManager
        await broadcastManager.setEnygmaManager(enygmaManager.target);

        // Adiciona dados Enygma
        await enygmaManager.setEnygmaData(1, 123, 456, []);
        await enygmaManager.setEnygmaData(2, 789, 101112, []);

        // Transmite os dados Enygma
        const enygmaData = await broadcastManager.broadcastEnygmaData();

        // Verifica se os dados retornados estão corretos
        const enygmaXValues = enygmaData.map((e: any) => e.babyJubjubX);
        expect(enygmaXValues).to.include(123);
        expect(enygmaXValues).to.include(789);
    });
});