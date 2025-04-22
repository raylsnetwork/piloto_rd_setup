import { expect } from "chai";
import { ethers, upgrades } from "hardhat";

describe("ParticipantStorage", function () {
    let participantManager: any, enygmaManager: any, broadcastManager: any, participantStorage: any;
    let owner: any;

    beforeEach(async function () {
        const [deployer] = await ethers.getSigners();
        owner = deployer.address;

        // Contratos dependentes
        const ParticipantManager = await ethers.getContractFactory("ParticipantManager");
        const EnygmaManager = await ethers.getContractFactory("EnygmaManager");
        const BroadcastManager = await ethers.getContractFactory("BroadcastManager");

        participantManager = await ParticipantManager.deploy();
        await participantManager.waitForDeployment();
        console.log(`ParticipantManager deployed at: ${participantManager.target}`);

        enygmaManager = await EnygmaManager.deploy();
        await enygmaManager.waitForDeployment();
        console.log(`EnygmaManager deployed at: ${enygmaManager.target}`);

        broadcastManager = await BroadcastManager.deploy();
        await broadcastManager.waitForDeployment();
        console.log(`BroadcastManager deployed at: ${broadcastManager.target}`);



        // Contrato principal
        const ParticipantStorage = await ethers.getContractFactory("ParticipantStorage");
        participantStorage = await upgrades.deployProxy(ParticipantStorage, [
            owner,                       // Endereço do proprietário
            participantManager.target,   // Endereço do ParticipantManager
            enygmaManager.target,        // Endereço do EnygmaManager
            broadcastManager.target      // Endereço do BroadcastManager
        ]);
        await participantStorage.waitForDeployment();
    });

    it("Should add a participant via ParticipantStorage", async function () {
        const chainId = 1;
        const name = "Alice";

        await participantStorage.addParticipant(chainId, name);
        const participant = await participantStorage.getParticipant(chainId);

        expect(participant.chainId).to.equal(chainId);
        expect(participant.name).to.equal(name);
    });

    it("Should set and get Enygma data via ParticipantStorage", async function () {
        const chainId = 1;
        const babyJubjubX = 123;
        const babyJubjubY = 456;

        await participantStorage.setEnygmaData(chainId, babyJubjubX, babyJubjubY, []);
        const enygmaData = await participantStorage.getEnygmaData(chainId);

        expect(enygmaData.babyJubjubX).to.equal(babyJubjubX);
        expect(enygmaData.babyJubjubY).to.equal(babyJubjubY);
    });

    it("Should set the correct owner during deployment", async function () {
        const contractOwner = await participantStorage.owner();
        expect(contractOwner).to.equal(owner);
    });

    /*it("Should broadcast participants via ParticipantStorage", async function () {
        // Adiciona participantes
        await participantStorage.addParticipant(1, "Alice");
        await participantStorage.addParticipant(2, "Bob");
    
        // Transmite os participantes
        const tx = await participantStorage.broadcastParticipants();
        console.log(tx);
        const receipt = await tx.wait();
        console.log(receipt);
    
        // Obtém o evento e valida os dados transmitidos
        const event = receipt.events.find((e: any) => e.event === "ParticipantsBroadcasted");
        const participants = event.args[0];

        expect(participants.length).to.equal(2);
        expect(participants[0].name).to.equal("Alice");
        expect(participants[1].name).to.equal("Bob");
    });

    it("Should broadcast Enygma data via ParticipantStorage", async function () {
        const chainId1 = 1;
        const chainId2 = 2;

        // Adiciona dados Enygma
        await participantStorage.setEnygmaData(chainId1, 123, 456, []);
        await participantStorage.setEnygmaData(chainId2, 789, 101112, []);

        // Transmite dados Enygma
        const enygmaData = await participantStorage.broadcastEnygmaData();

        // Verifica os dados transmitidos
        expect(enygmaData.length).to.equal(2);
        expect(enygmaData[0].babyJubjubX).to.equal(123);
        expect(enygmaData[1].babyJubjubX).to.equal(789);
    });*/
});