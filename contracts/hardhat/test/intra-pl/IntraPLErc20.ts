import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { genRanHex } from '../../tasks/deployToken';
import { EndpointV1, TokenExample, TokenRegistryV1 } from '../../../typechain-types';
import { pollCondition } from '../e2e/Utils';

describe.skip('IntraPL Erc20 tests: Continuous Performace', function () {
  const rpcUrlA = process.env[`RPC_URL_NODE_C`];
  const rpcUrlCC = process.env[`RPC_URL_NODE_CC`];
  const endpointAddressA = process.env[`NODE_C_ENDPOINT_ADDRESS`] as string;
  const deploymentProxyRegistryAddress = process.env[`COMMITCHAIN_CCDEPLOYMENTPROXYREGISTRY`] as string;
  let tokenRegistryAddress = '' as string;

  const providerA = new ethers.JsonRpcProvider(rpcUrlA);
  const providerCC = new ethers.JsonRpcProvider(rpcUrlCC);
  providerA.pollingInterval = 200;
  providerCC.pollingInterval = 200;

  const walletCC = new ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
  const walletRandom = ethers.Wallet.createRandom();

  const signerA = walletRandom.connect(providerA);
  const signerCC = walletCC.connect(providerCC);
  let tokenOnPLA: TokenExample;
  let tokenRegistry: TokenRegistryV1;
  let endpointA: EndpointV1;
  const randHex = `0x${genRanHex(6)}`;
  const tokenName = `Token ${randHex}`;
  const tokenSymbol = `T_${randHex}`;

  // tests
  // N: How many transactions to send
  const testN = [1, 10, 100, 1000, 5000];
  // N: How many transactions to send
  // X: Interval between transfers (seconds)
  // Y: Time to keep the test running (seconds)
  const testNXY = [
    { NHowMany: 1, XInterval: 1, YTestTime: 60 },
    { NHowMany: 10, XInterval: 1, YTestTime: 60 },
    { NHowMany: 100, XInterval: 1, YTestTime: 60 },
    { NHowMany: 1000, XInterval: 1, YTestTime: 60 },
    { NHowMany: 1000, XInterval: 5, YTestTime: 60 },
    { NHowMany: 5000, XInterval: 1, YTestTime: 60 },
    { NHowMany: 5000, XInterval: 5, YTestTime: 60 },
    { NHowMany: 1000, XInterval: 5, YTestTime: 60 * 10 },
    { NHowMany: 1000, XInterval: 5, YTestTime: 60 * 60 },
    { NHowMany: 5000, XInterval: 5, YTestTime: 60 * 10 },
    { NHowMany: 5000, XInterval: 5, YTestTime: 60 * 60 }
  ];

  before(async function () {
    console.log(`${new Date().toISOString()}: Preparing tests... `);

    // Load the Deployment Registry contract
    const deploymentRegistry = await ethers.getContractAt('DeploymentProxyRegistry', deploymentProxyRegistryAddress, signerCC);
    const deployment = await deploymentRegistry.getDeployment();
    tokenRegistryAddress = deployment.tokenRegistryAddress;

    const TokenErc20 = await hre.ethers.getContractFactory('TokenExample', signerA);
    tokenRegistry = await hre.ethers.getContractAt('TokenRegistryV1', tokenRegistryAddress, signerCC);
    endpointA = await hre.ethers.getContractAt('EndpointV1', endpointAddressA, signerA);
    tokenOnPLA = await TokenErc20.deploy(tokenName, tokenSymbol, endpointAddressA);
    await Promise.all([tokenOnPLA.waitForDeployment()]);
  });

  describe('Single Transaction Transfers', function () {
    testN.forEach((transactionNumber) => {
      it(`${transactionNumber} Transactions`, async function () {
        console.log(`${new Date().toISOString()}: Starting sending ${transactionNumber} transactions...`);
        let itCount = 0;
        for (let i = 0; i < transactionNumber; i++) {
          const timeItStart = Date.now();
          itCount++;
          const amount = 30;
          await tokenOnPLA.transfer(walletRandom.address, amount);
          const timeItEnd = Date.now() - timeItStart;
          console.log(`${new Date().toISOString()} - [N=${transactionNumber}]: #${itCount}: ${timeItEnd}ms`);
        }
      }).timeout(transactionNumber * 5 * 1000); // 5 seconds timeout per transaction
    });
  });

  describe('Multiple Transactions Transfers', function () {
    testNXY.forEach((test) => {
      it(`${test.NHowMany} Transactions for ${test.YTestTime}s in intervals of ${test.XInterval}s`, async function () {
        console.log(`${new Date().toISOString()}: Starting sending ${test.NHowMany} transactions for ${test.YTestTime}s in intervals of ${test.XInterval}s...`);
        const testStartTime = Date.now();
        let totalCount = 0;
        // while the time is ticking...
        while (Date.now() - testStartTime < test.YTestTime * 1000) {
          const timeItStart = Date.now();
          for (let i = 0; i < test.NHowMany; i++) {
            totalCount++;
            const amount = 30;
            tokenOnPLA.transfer(walletRandom.address, amount);
          }
          //const timeItEnd = Date.now() - timeItStart;
          //console.log(`${(new Date()).toISOString()} - [N=${test.NHowMany}, X=${test.YTestTime}s, Y=${test.XInterval}s]: Sent ${test.NHowMany} in ${timeItEnd}ms, Waiting ${test.XInterval} seconds...`);
          // sleeps
          await new Promise((r) => setTimeout(r, test.XInterval * 1000));
        }

        console.log(`${new Date().toISOString()} - [N=${test.NHowMany}, X=${test.YTestTime}s, Y=${test.XInterval}s]: Reached ${test.YTestTime} seconds. Transactions sent: ${totalCount}`);
      }).timeout(2 * 60 * 60 * 1000); //2 hours timeout
    });
  });
});
//}).timeout(5 * 60 * 60 * 1000); //five hours timetout (only works with no '.skip')
