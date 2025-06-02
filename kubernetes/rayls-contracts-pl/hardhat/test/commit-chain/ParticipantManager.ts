import { expect } from "chai";
import { ethers } from "hardhat";

describe("ParticipantManager", function () {
    let participantManager: any;

    beforeEach(async function () {
        const ParticipantManager = await ethers.getContractFactory("ParticipantManager");
        participantManager = await ParticipantManager.deploy();
        console.log(`ParticipantManager deployed at: ${participantManager.address}`);
        await participantManager.waitForDeployment();
    });

    it("Should add a participant", async function () {
        const chainId = 1;
        const name = "Alice";

        await participantManager.addParticipant(chainId, name);

        const participant = await participantManager.getParticipant(chainId);
        expect(participant.chainId).to.equal(chainId);
        expect(participant.name).to.equal(name);
    });

    it("Should update a participant's name", async function () {
        const chainId = 1;
        const name = "Alice";
        const newName = "Alice Updated";

        await participantManager.addParticipant(chainId, name);
        await participantManager.updateParticipantName(chainId, newName);

        const participant = await participantManager.getParticipant(chainId);
        expect(participant.name).to.equal(newName);
    });

    it("Should validate a participant", async function () {
        const chainId = 1;
        const name = "Alice";

        await participantManager.addParticipant(chainId, name);
        await participantManager.validateParticipant(chainId);
    });

    it("Should revert when validating a non-existent participant", async function () {
        await expect(participantManager.validateParticipant(999)).to.be.revertedWith(
            "Participant not registered"
        );
    });
});