import { expect } from "chai";
import { ethers } from "hardhat";

describe("EnygmaManager", function () {
    let enygmaManager: any;

    beforeEach(async function () {
        const EnygmaManager = await ethers.getContractFactory("EnygmaManager");
        enygmaManager = await EnygmaManager.deploy();
        console.log(`EnygmaManager deployed at: ${enygmaManager.address}`);
        await enygmaManager.waitForDeployment();
    });

    it("Should set and get Enygma data", async function () {
        const chainId = 1;
        const babyJubjubX = 123;
        const babyJubjubY = 456;
        const addresses = ["0x1234567890123456789012345678901234567890"];

        await enygmaManager.setEnygmaData(chainId, babyJubjubX, babyJubjubY, addresses);
        const enygmaData = await enygmaManager.getEnygmaData(chainId);

        expect(enygmaData.babyJubjubX).to.equal(babyJubjubX);
        expect(enygmaData.babyJubjubY).to.equal(babyJubjubY);
        expect(enygmaData.plAddresses[0]).to.equal(addresses[0]);
    });

    it("Should validate an Enygma participant", async function () {
        const chainId = 1;
        const babyJubjubX = 123;
        const babyJubjubY = 456;

        await enygmaManager.setEnygmaData(chainId, babyJubjubX, babyJubjubY, []);
        await enygmaManager.validateEnygmaParticipant(chainId);
    });

    it("Should revert when validating a non-existent Enygma participant", async function () {
        await expect(enygmaManager.validateEnygmaParticipant(999)).to.be.revertedWith(
            "Enygma participant not registered"
        );
    });

    it("Should return all Enygma participant chain IDs", async function () {
        const chainId1 = 1;
        const chainId2 = 2;
    
        await enygmaManager.setEnygmaData(chainId1, 123, 456, []);
        await enygmaManager.setEnygmaData(chainId2, 789, 101112, []);
    
        const chainIds = await enygmaManager.getEnygmaAllParticipantsChainIds();
        const chainIdNumbers = chainIds.map((id: BigInt) => Number(id)); // Converte BigInt para números
    
        expect(chainIdNumbers).to.include(chainId1);
        expect(chainIdNumbers).to.include(chainId2);
    });
});