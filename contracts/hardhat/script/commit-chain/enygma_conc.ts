import '@nomicfoundation/hardhat-ethers';
import '@openzeppelin/hardhat-upgrades';
import hre, { ethers } from 'hardhat';

require('dotenv').config();

async function main() {
  await GetAllPublicVariablesAndValues(enygmaCCAddress);
  await printPendingTransactions(enygmaCCAddress);
  await printPendingMintsAndBurns(enygmaCCAddress);
  await CheckPendingBalancesTallied(enygmaCCAddress, LastBlockNumberRegisteredInDB);
  await GetLastblockNumAtCurrentBlockNumber(enygmaCCAddress, LastBlockNumberRegisteredInDB);
}

const enygmaCCAddress = "0x5c54B4b734543F48d021a90f3cF0A0A55630EEB7";
const LastBlockNumberRegisteredInDB = 2092427; // Replace with the actual block number from your database

/**
 * Fetches and prints all public variables and results of getPublicValues* functions.
 * @param enygmaAddress - Address of the EnygmaV1 contract
 */
async function GetAllPublicVariablesAndValues(enygmaAddress: string) {
  const enygmaV2 = await hre.ethers.getContractAt('EnygmaV1', enygmaAddress);

  // Fetch public variables
  const totalSupplyX = (await enygmaV2.totalSupplyX()).toString();
  const totalSupplyY = (await enygmaV2.totalSupplyY()).toString();
  const totalSupply = (await enygmaV2.totalSupply()).toString();
  const ownerChainId = (await enygmaV2.ownerChainId()).toString();
  const lastblockNum = (await enygmaV2.lastblockNum()).toString();
  const lastblockNumPending = (await enygmaV2.lastblockNumPending()).toString();
  const participantStorageContract = await enygmaV2.participantStorageContract();
  const tokenRegistryContract = await enygmaV2.tokenRegistryContract();

  console.log('Public Variables:');
  console.log('Total Supply X:', totalSupplyX);
  console.log('Total Supply Y:', totalSupplyY);
  console.log('Total Supply:', totalSupply);
  console.log('Owner Chain ID:', ownerChainId);
  console.log('Last Block Number:', lastblockNum);
  console.log('Last Block Number Pending:', lastblockNumPending);
  console.log('Participant Storage Contract:', participantStorageContract);
  console.log('Token Registry Contract:', tokenRegistryContract);

  // Fetch public values for all states
  console.log('\nFinalised Public Values:');
  await printPublicValues(await enygmaV2.getPublicValuesFinalised());

  console.log('\nPending Public Values:');
  await printPublicValues(await enygmaV2.getPublicValuesPending());

  //console.log('\nPublic Values By Block Number:');
  //await printPublicValues(await enygmaV2.getPublicValuesByBlockNumber(lastblockNum));
}

/**
 * Fetches and prints the pending mints and burns from the EnygmaV1 contract.
 * @param enygmaAddress - Address of the EnygmaV1 contract
 */
async function printPendingMintsAndBurns(enygmaAddress: string) {
  const enygmaV2 = await hre.ethers.getContractAt('EnygmaV1', enygmaAddress);

  // Call getPendingMintsAndBurns and retrieve the data
  const pendingMintsAndBurns = await enygmaV2.getPendingMintsAndBurns();

  // Parse and print each pending mint or burn
  const parsedMintsAndBurns = pendingMintsAndBurns.map((entry, index) => ({
    index,
    transactionType: entry.transactionType === 1n ? 'Mint' : 'Burn',
    blockNumber: entry.blockNumber.toString(),
    amount: entry.amount.toString(),
    pointToAddToBalance: {
      c1: entry.pointToAddToBalance.c1.toString(),
      c2: entry.pointToAddToBalance.c2.toString(),
      chainId: entry.pointToAddToBalance.chainId.toString(),
    },
  }));

  console.log('Pending Mints and Burns:', JSON.stringify(parsedMintsAndBurns, null, 2));
}

/**
 * Fetches and prints the value of lastblockNumAtCurrentBlockNumber for a specific block number.
 * @param enygmaAddress - Address of the EnygmaV1 contract
 * @param currentBlockNumber - The block number to query
 */
async function GetLastblockNumAtCurrentBlockNumber(enygmaAddress: string, currentBlockNumber: number) {
  const enygmaV2 = await hre.ethers.getContractAt('EnygmaV1', enygmaAddress);

  try {
    const lastBlockNum = await enygmaV2.getLastblockNumAtCurrentBlockNumber(currentBlockNumber);

    if (lastBlockNum.toString() === '0') {
      console.log(`❌ No last block number recorded for current block number ${currentBlockNumber}.`);
    } else {
      console.log(`✅ Last block number for current block number ${currentBlockNumber}: ${lastBlockNum.toString()}`);
    }
  } catch (err) {
    console.error("❌ Error querying lastblockNumAtCurrentBlockNumber:", err);
  }
}

/**
 * Prints the public values retrieved from getPublicValues* functions.
 * @param values - The tuple containing balances and public keys
 */
async function printPublicValues(values: [any[], any[]]) {
  const [balances, publicKeys] = values;

  const parsedBalances = balances.map((balance) => ({
    c1: balance.c1.toString(),
    c2: balance.c2.toString(),
    chainId: balance.chainId.toString(),
  }));

  const parsedPublicKeys = publicKeys.map((key) => ({
    c1: key.c1.toString(),
    c2: key.c2.toString(),
    chainId: key.chainId.toString(),
  }));

  console.log('Balances:', JSON.stringify(parsedBalances, null, 2));
  //console.log('Public Keys:', JSON.stringify(parsedPublicKeys, null, 2));
}

/**
 * Prints the pending transactions from the EnygmaV1 contract.
 * @param enygmaAddress - Address of the EnygmaV1 contract
 */
async function printPendingTransactions(enygmaAddress: string) {
  const enygmaV2 = await hre.ethers.getContractAt('EnygmaV1', enygmaAddress);

  // Call getPendingTransactions and retrieve the data
  const pendingTransactions = await enygmaV2.getPendingTransactions();

  // Parse and print each pending transaction
  const parsedTransactions = pendingTransactions.map((tx, index) => ({
    index,
    nullifier: tx.nullifier.toString(),
    pointsToAddToBalance: tx.pointsToAddToBalance.map((point) => ({
      c1: point.c1.toString(),
      c2: point.c2.toString(),
      chainId: point.chainId.toString(),
    })),
  }));

  console.log('Pending Transactions:', JSON.stringify(parsedTransactions, null, 2));
}

/**
 * Checks if pending balances for a given block number have been tallied.
 * @param enygmaAddress - Address of the EnygmaV1 contract
 * @param lastBlockNumber - The block number to check
 */
async function CheckPendingBalancesTallied(enygmaAddress: string, lastBlockNumber: number) {
  const enygmaV2 = await hre.ethers.getContractAt('EnygmaV1', enygmaAddress);

  try {
    const isTallied = await enygmaV2.pendingBalancesTallied(lastBlockNumber);

    if (isTallied) {
      console.log(`✅ Pending balances for block number ${lastBlockNumber} have been tallied.`);
    } else {
      console.log(`❌ Pending balances for block number ${lastBlockNumber} have NOT been tallied.`);
    }
  } catch (err) {
    console.error("❌ Error querying pendingBalancesTallied:", err);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
