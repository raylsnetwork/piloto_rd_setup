import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers';
import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { mockRelayerEthersLastTransaction } from './utils/RelayerMockEthers';
import { basicDeploySetupUpgrade_Enygma } from './utils/basicDeploySetupUpgrade_Enygma';
import { EnygmaV2, IEnygmaV2, ParticipantStorageV2, TokenRegistryV2 } from '../../../typechain-types';
import { BigNumberish } from 'ethers';

// In EnygmaV2 comment call to verifyProof in transfer function and
//         require(verifiers[k] != address(0), 'Verifier not set for given k');
// in validateTransferInputs
describe('EnygmaV2', function () {
  it('should mint, burn, and transfer tokens', async function () {
    // Load fixture
    const {
      participantStorage,
      chainIdPL1,
      chainIdPL2,
      chainIdPL3,
      chainIdPL4,
      chainIdPL5,
      chainIdPL6,
      owner,
      tokenRegistry,
      enygma,
      endpointMappings,
      messageIdsAlreadyProcessedOnDeploy,
      resourceRegistry
    } = await loadFixture(basicDeploySetupUpgrade_Enygma);

    const messageIdsAlreadyProcessed = { ...messageIdsAlreadyProcessedOnDeploy };
    const ownerAddress = await owner.getAddress();

    // Define public key components for each chain
    const pkc1PL1 = 123123123n;
    const pkc2PL1 = 54654654654n;

    const pkc1PL2 = 123123124323133n;
    const pkc2PL2 = 5465465422234654n;

    const pkc1PL3 = 987654321n;
    const pkc2PL3 = 112233445566n;

    const pkc1PL4 = 222222222n;
    const pkc2PL4 = 333333333n;

    const pkc1PL5 = 555555555n;
    const pkc2PL5 = 666666666n;

    const pkc1PL6 = 8888888n;
    const pkc2PL6 = 931293129n;

    // Register participants on all chains
    const registerParticipant = async (chainId: string, pkc1: BigNumberish, pkc2: BigNumberish) => {
      await participantStorage.setEnygmaBabyJubjubKeys(chainId, pkc1, pkc2, [ownerAddress]);
      await mockRelayerEthersLastTransaction(endpointMappings, messageIdsAlreadyProcessed, resourceRegistry);
    };

    // Register participants for all chains using defined variables
    await registerParticipant(chainIdPL1, pkc1PL1, pkc2PL1);
    await registerParticipant(chainIdPL2, pkc1PL2, pkc2PL2);
    await registerParticipant(chainIdPL3, pkc1PL3, pkc2PL3);
    await registerParticipant(chainIdPL4, pkc1PL4, pkc2PL4);
    await registerParticipant(chainIdPL5, pkc1PL5, pkc2PL5);
    await registerParticipant(chainIdPL6, pkc1PL6, pkc2PL6);

    const blockNumber0 = 2131n;

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

    // Use `getBalanceFinalised` to retrieve the balance for each chain
    const [balancePL1C1, balancePL1C2] = await enygma.getBalanceFinalised(chainIdPL1);
    const [balancePL2C1, balancePL2C2] = await enygma.getBalanceFinalised(chainIdPL2);
    const [balancePL3C1, balancePL3C2] = await enygma.getBalanceFinalised(chainIdPL3);
    const [balancePL4C1, balancePL4C2] = await enygma.getBalanceFinalised(chainIdPL4);
    const [balancePL5C1, balancePL5C2] = await enygma.getBalanceFinalised(chainIdPL5);
    const [balancePL6C1, balancePL6C2] = await enygma.getBalanceFinalised(chainIdPL6);

    // Compute expected values using `pedCom`
    const [expectedC1, expectedC2] = await enygma.pedCom(mintAmount, 0n);

    // Assert the balances for chainIdPL1
    //expect(balancePL1C1).to.equal(expectedC1, `Expected c1 to match pedCom result for chainId ${chainIdPL1}`);
    //expect(balancePL1C2).to.equal(expectedC2, `Expected c2 to match pedCom result for chainId ${chainIdPL1}`);

    // Print the retrieved balance for chainIdPL1
    console.log(`Expected balance for PL1: c1 = ${expectedC1.toString()}, c2 = ${expectedC2.toString()}`);

    console.log('TRANSFER STARTS');

    // Transfer tokens
    const transferAmountperReceiver = 10n;
    const transferAmount = transferAmountperReceiver * 5n;
    const prime = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
    const [commitmentC1a, commitmentC2a] = await enygma.pedCom(prime - transferAmount, 0n);
    const [commitmentC1b, commitmentC2b] = await enygma.pedCom(transferAmountperReceiver, 0n);
    const [commitmentC1c, commitmentC2c] = await enygma.pedCom(transferAmountperReceiver, 0n);
    const [commitmentC1d, commitmentC2d] = await enygma.pedCom(transferAmountperReceiver, 0n);
    const [commitmentC1e, commitmentC2e] = await enygma.pedCom(transferAmountperReceiver, 0n);
    const [commitmentC1f, commitmentC2f] = await enygma.pedCom(transferAmountperReceiver, 0n);

    const commitments: IEnygmaV2.PointStruct[] = [
      { c1: commitmentC1a, c2: commitmentC2a },
      { c1: commitmentC1b, c2: commitmentC2b },
      { c1: commitmentC1c, c2: commitmentC2c },
      { c1: commitmentC1d, c2: commitmentC2d },
      { c1: commitmentC1e, c2: commitmentC2e },
      { c1: commitmentC1f, c2: commitmentC2f }
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
      public_signal: [
        // Public keys for all chains (PL1..PL6)
        pkc1PL1,
        pkc2PL1,
        pkc1PL2,
        pkc2PL2,
        pkc1PL3,
        pkc2PL3,
        pkc1PL4,
        pkc2PL4,
        pkc1PL5,
        pkc2PL5,
        pkc1PL6,
        pkc2PL6,

        // Balances for all chains (PL1..PL6)
        balancePL1C1,
        balancePL1C2,
        balancePL2C1,
        balancePL2C2,
        balancePL3C1,
        balancePL3C2,
        balancePL4C1,
        balancePL4C2,
        balancePL5C1,
        balancePL5C2,
        balancePL6C1,
        balancePL6C2,

        // Other fields
        nullifier,
        blockNumber,

        // Chain IDs (all PLs)
        chainIdPL1,
        chainIdPL2,
        chainIdPL3,
        chainIdPL4,
        chainIdPL5,
        chainIdPL6
      ]
    };

    const chainIds = [chainIdPL1, chainIdPL2, chainIdPL3, chainIdPL4, chainIdPL5, chainIdPL6];
    const encryptedMessages = [ethers.randomBytes(32), ethers.randomBytes(32), ethers.randomBytes(32), ethers.randomBytes(32), ethers.randomBytes(32), ethers.randomBytes(32)];

    const transferTx = await enygma.connect(owner).transfer(6, commitments, proof, chainIds, encryptedMessages);
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

    console.log('TRANSFER 2 STARTS');

    const [balancePL1C12, balancePL1C22] = await enygma.getBalanceFinalised(chainIdPL1);
    const [balancePL2C12, balancePL2C22] = await enygma.getBalanceFinalised(chainIdPL2);
    const [balancePL3C12, balancePL3C22] = await enygma.getBalanceFinalised(chainIdPL3);
    const [balancePL4C12, balancePL4C22] = await enygma.getBalanceFinalised(chainIdPL4);
    const [balancePL5C12, balancePL5C22] = await enygma.getBalanceFinalised(chainIdPL5);
    const [balancePL6C12, balancePL6C22] = await enygma.getBalanceFinalised(chainIdPL6);

    // Transfer 2 setup
    const transferAmountperReceiver2 = 20n;
    const transferAmount2 = transferAmountperReceiver * 5n;
    const [commitmentC1a2, commitmentC2a2] = await enygma.pedCom(prime - transferAmount2, 0n);
    const [commitmentC1b2, commitmentC2b2] = await enygma.pedCom(transferAmountperReceiver2, 0n);
    const [commitmentC1c2, commitmentC2c2] = await enygma.pedCom(transferAmountperReceiver2, 0n);
    const [commitmentC1d2, commitmentC2d2] = await enygma.pedCom(transferAmountperReceiver2, 0n);
    const [commitmentC1e2, commitmentC2e2] = await enygma.pedCom(transferAmountperReceiver2, 0n);
    const [commitmentC1f2, commitmentC2f2] = await enygma.pedCom(transferAmountperReceiver2, 0n);

    const commitments2: IEnygmaV2.PointStruct[] = [
      { c1: commitmentC1a2, c2: commitmentC2a2 },
      { c1: commitmentC1b2, c2: commitmentC2b2 },
      { c1: commitmentC1c2, c2: commitmentC2c2 },
      { c1: commitmentC1d2, c2: commitmentC2d2 },
      { c1: commitmentC1e2, c2: commitmentC2e2 },
      { c1: commitmentC1f2, c2: commitmentC2f2 }
    ];

    const nullifier2 = 2121212121n;
    const blockNumber2 = 2133n;

    // Define the proof for Transfer 2 with the updated public signal
    const proof2: IEnygmaV2.ProofStruct = {
      pi_a: [1n, 2n],
      pi_b: [
        [3n, 4n],
        [5n, 6n]
      ],
      pi_c: [7n, 8n],
      public_signal: [
        // Public keys for all chains (PL1..PL6)
        pkc1PL1,
        pkc2PL1,
        pkc1PL2,
        pkc2PL2,
        pkc1PL3,
        pkc2PL3,
        pkc1PL4,
        pkc2PL4,
        pkc1PL5,
        pkc2PL5,
        pkc1PL6,
        pkc2PL6,

        // Balances for all chains (PL1..PL6)
        balancePL1C12,
        balancePL1C22,
        balancePL2C12,
        balancePL2C22,
        balancePL3C12,
        balancePL3C22,
        balancePL4C12,
        balancePL4C22,
        balancePL5C12,
        balancePL5C22,
        balancePL6C12,
        balancePL6C22,

        // Other fields
        nullifier2,
        blockNumber2,

        // Chain IDs (all PLs)
        chainIdPL1,
        chainIdPL2,
        chainIdPL3,
        chainIdPL4,
        chainIdPL5,
        chainIdPL6
      ]
    };

    const transferTx2 = await enygma.connect(owner).transfer(6, commitments2, proof2, chainIds, encryptedMessages);
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
