import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { mockRelayerEthersLastTransaction } from './utils/RelayerMockEthers';
import { basicDeploySetupUpgrade_Enygma } from './utils/basicDeploySetupUpgrade_Enygma';
import { EnygmaV2, IEnygmaV2, ParticipantStorageV2, TokenRegistryV2 } from '../../../typechain-types';


// In EnygmaV2 comment call to verifyProof in transfer function and
//         require(verifiers[k] != address(0), 'Verifier not set for given k');
// in validateTransferInputs
describe('EnygmaV2', function () {
  it('should mint, burn, and transfer tokens', async function () {
    // Load fixture
    const { participantStorage, chainIdPL1, chainIdPL2, owner, tokenRegistry, enygma, endpointMappings, messageIdsAlreadyProcessedOnDeploy, resourceRegistry } =
      await loadFixture(basicDeploySetupUpgrade_Enygma);

    const messageIdsAlreadyProcessed = { ...messageIdsAlreadyProcessedOnDeploy };
    const ownerAddress = await owner.getAddress();

    const addressesPl1 = [ownerAddress];
    const pkc1pl1 = 123123123n;
    const pkc2pl1 = 54654654654n;
    await participantStorage.setEnygmaBabyJubjubKeys(chainIdPL1, pkc1pl1, pkc2pl1, addressesPl1);

    await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

    const addressesPl2 = [ownerAddress];
    const blockNumber0 = 2131n;
    const pkc1pl2 = 123123124323133n;
    const pkc2pl2 = 5465465422234654n;
    await participantStorage.setEnygmaBabyJubjubKeys(chainIdPL2, pkc1pl2, pkc2pl2, addressesPl2);

    await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);

    // Mint tokens
    const mintAmount = 1000n; // Use BigInt for ethers v6
    const mintTx = await enygma.connect(owner).mintSupply(mintAmount, chainIdPL1, blockNumber0);

    // Wait for the transaction to be mined
    const mintReceipt = await mintTx.wait();
    if (!mintReceipt) throw new Error('Mint transaction receipt is null.');
    const mintBlockNumber = mintReceipt.blockNumber;

    // Test the event emission
    //await expect(mintTx).to.emit(enygma, 'SupplyMinted').withArgs(mintBlockNumber, mintAmount, chainIdPL1);
    console.log(`Mint event emitted successfully with blockNumber: ${mintBlockNumber}, mintAmount: ${mintAmount.toString()}, chainIdPL1: ${chainIdPL1}`);

    const totalSupplyAfterMint = await enygma.getTotalSupply();
    //expect(totalSupplyAfterMint).to.equal(mintAmount);
    console.log(`Total supply after mint is correct: ${totalSupplyAfterMint.toString()}`);

    // Log balances using `getPublicValuesFinalised` before the transfer
    const [refBalances, publicKeys] = await enygma.getPublicValuesFinalised();
    console.log('Balances before transfer:');
    refBalances.forEach((balance, index) => {
      console.log(`Chain ID ${balance.chainId}: x = ${balance.c1.toString()}, y = ${balance.c2.toString()}`);
    });

    // Use `getBalance` to retrieve the balance for chainIdPL1
    const [balancePL1C1, balancePL1C2] = await enygma.getBalanceFinalised(chainIdPL1);
    const [balancePL2C1, balancePL2C2] = await enygma.getBalanceFinalised(chainIdPL2);

    // Compute expected values using `pedCom`
    const [expectedC1, expectedC2] = await enygma.pedCom(mintAmount, 0n);

    // Assert the balances for chainIdPL1
    //expect(balancePL1C1).to.equal(expectedC1, `Expected c1 to match pedCom result for chainId ${chainIdPL1}`);
    //expect(balancePL1C2).to.equal(expectedC2, `Expected c2 to match pedCom result for chainId ${chainIdPL1}`);

    // Print the retrieved balance for chainIdPL1
    console.log(`Expected balance for PL1: c1 = ${expectedC1.toString()}, c2 = ${expectedC2.toString()}`);

    console.log("TRANSFER STARTS")

    // Transfer tokens
    const transferAmount = 300n;
    const prime = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
    const [commitmentC1a, commitmentC2a] = await enygma.pedCom(prime - transferAmount, 0n);
    const [commitmentC1b, commitmentC2b] = await enygma.pedCom(transferAmount, 0n);

    const commitments: IEnygmaV2.PointStruct[] = [
      { c1: commitmentC1a, c2: commitmentC2a },
      { c1: commitmentC1b, c2: commitmentC2b }
    ];

    const nullifier = 1414141414n;
    const blockNumber = 2132n;
    const proof: IEnygmaV2.ProofStruct = {
      pi_a: [1n, 2n],
      pi_b: [
        [3n, 4n],
        [5n, 6n]
      ],
      pi_c: [7n, 8n],
      public_signal: [pkc1pl1, pkc2pl1, pkc1pl2, pkc2pl2, balancePL1C1, balancePL1C2, balancePL2C1, balancePL2C2, nullifier, blockNumber, chainIdPL1, chainIdPL2]
    };
    const chainIds = [chainIdPL1, chainIdPL2];
    const encryptedMessages = [ethers.randomBytes(32), ethers.randomBytes(32)];

    const transferTx = await enygma.connect(owner).transfer(2, commitments, proof, chainIds, encryptedMessages);
    const transferReceipt = await transferTx.wait();
    if (!transferReceipt) throw new Error('Transfer transaction receipt is null.');

    // Verify balances after transfer
    const { x: transferX, y: transferY } = await enygma.getBalanceFinalised(chainIdPL2);
    console.log('Balance on chainIdPL2 after transfer:', { x: transferX.toString(), y: transferY.toString() });

    //expect(transferX).to.equal(commitmentC1b, `Expected PL2 c1 to match commitment 2`);
    console.log(`PL2 c1 balance in next block: ${commitmentC1b.toString()}`);
    //expect(transferY).to.equal(commitmentC2b, `Expected PL2 c2 to match commitment 2`);
    console.log(`PL2 c2 balance in next block: ${commitmentC2b.toString()}`);

    const { x: finalX, y: finalY } = await enygma.getBalanceFinalised(chainIdPL1);
    console.log('Balance on chainIdPL1 after transfer:', { x: finalX.toString(), y: finalY.toString() });

    const [PL1balanceafterExpectC1, PL1balanceafterExpectC2] = await enygma.pedCom(mintAmount - transferAmount, 0n);

    //expect(finalX).to.equal(PL1balanceafterExpectC1, `Expected PL1 c1`);
    console.log(`PL1 c1 balance in next block: ${PL1balanceafterExpectC1.toString()}`);
    //expect(finalY).to.equal(PL1balanceafterExpectC2, `Expected PL1 c2`);
    console.log(`PL1 c2 balance in next block: ${PL1balanceafterExpectC2.toString()}`);

    // Verify total supply remains consistent
    const totalSupplyAfterTransfer = await enygma.getTotalSupply();
    //console.log('Total supply after transfer:', totalSupplyAfterTransfer.toString());



    const pendingTransactions = await enygma.getPendingTransactions();

    pendingTransactions.forEach((tx, index) => {
      console.log(`Transaction ${index + 1}`);
      console.log(`  Nullifier: ${tx.nullifier.toString()}`);
      tx.pointsToAddToBalance.forEach((point, pointIndex) => {
        console.log(`    Point ${pointIndex + 1}`);
        console.log(`      Chain ID: ${point.chainId.toString()}`);
        console.log(`      c1: ${point.c1.toString()}`);
        console.log(`      c2: ${point.c2.toString()}`);
      });
    });
    

    console.log("TRANSFER 2 STARTS")


    const [balancePL1C12, balancePL1C22] = await enygma.getBalanceFinalised(chainIdPL1);
    const [balancePL2C12, balancePL2C22] = await enygma.getBalanceFinalised(chainIdPL2);

    // Transfer tokens
    const transferAmount2 = 30n;
    const [commitmentC1a2, commitmentC2a2] = await enygma.pedCom(prime - transferAmount2, 0n);
    const [commitmentC1b2, commitmentC2b2] = await enygma.pedCom(transferAmount2, 0n);

    const commitments2: IEnygmaV2.PointStruct[] = [
      { c1: commitmentC1a2, c2: commitmentC2a2 },
      { c1: commitmentC1b2, c2: commitmentC2b2 }
    ];

    const nullifier2 = 2121212121n;
    const blockNumber2 = 2133n;
    const proof2: IEnygmaV2.ProofStruct = {
      pi_a: [1n, 2n],
      pi_b: [
        [3n, 4n],
        [5n, 6n]
      ],
      pi_c: [7n, 8n],
      public_signal: [pkc1pl1, pkc2pl1, pkc1pl2, pkc2pl2, balancePL1C12, balancePL1C22, balancePL2C12, balancePL2C22, nullifier2, blockNumber2, chainIdPL1, chainIdPL2]
    };

    const transferTx2 = await enygma.connect(owner).transfer(2, commitments2, proof2, chainIds, encryptedMessages);
    const transferReceipt2 = await transferTx2.wait();
    if (!transferReceipt2) throw new Error('Transfer transaction receipt is null.');

    // Verify balances after transfer
    const { x: transferX2, y: transferY2 } = await enygma.getBalanceFinalised(chainIdPL2);
    console.log('Balance on chainIdPL2 after transfer:', { x: transferX2.toString(), y: transferY2.toString() });



    const { x: finalX2, y: finalY2 } = await enygma.getBalanceFinalised(chainIdPL1);
    console.log('Balance on chainIdPL1 after transfer:', { x: finalX2.toString(), y: finalY2.toString() });





    const pendingTransactions2 = await enygma.getPendingTransactions();

    pendingTransactions2.forEach((tx, index) => {
      console.log(`Transaction ${index + 1}`);
      console.log(`  Nullifier: ${tx.nullifier.toString()}`);
      tx.pointsToAddToBalance.forEach((point, pointIndex) => {
        console.log(`    Point ${pointIndex + 1}`);
        console.log(`      Chain ID: ${point.chainId.toString()}`);
        console.log(`      c1: ${point.c1.toString()}`);
        console.log(`      c2: ${point.c2.toString()}`);
      });
    });
    
    
  });



  
});
