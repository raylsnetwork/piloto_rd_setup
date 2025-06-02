import { task } from 'hardhat/config';
import { Spinner } from '../utils/spinner';
import { getEnygmaBySymbol } from './checkTokenAllChains';
import { SharedObjects } from '../../typechain-types/src/rayls-protocol-sdk/tokens/RaylsEnygmaHandler';
import * as path from "path";
import * as fs from "fs";

task('sendEnygmaCrossFrom', 'Sends enygma from one private ledger to another, on behalf of a user using a wallet with allowance')
  .addParam('symbol', 'The token symbol')
  .addParam('plorigin', 'The origin PL (e.g., A, B, C, D, BACEN, TREASURY)')
  .addParam('pldest', 'The primary destination PL (e.g., A, B, C, D, BACEN, TREASURY)')
  .addParam('from', 'The primary source address. This address must grant allowance to the caller (wallet) of this script')
  .addParam('to', 'The primary destination address')
  .addParam('amount', 'The primary amount to be transferred')
  .addOptionalParam('callablesPath', 'Path to a Json file, containing an array of callables for the primary destination')
  .addOptionalParam('pldest1', 'The optional second destination PL')
  .addOptionalParam('to1', 'The optional second destination address')
  .addOptionalParam('amount1', 'The amount for the second destination')
  .addOptionalParam('callablesPath1', 'Path to a Json file, containing an array of callables for the second destination')
  .addOptionalParam('pldest2', 'The optional third destination PL')
  .addOptionalParam('to2', 'The optional third destination address')
  .addOptionalParam('amount2', 'The amount for the third destination')
  .addOptionalParam('callablesPath2', 'Path to a Json file, containing an array of callables for the third destination')
  .addOptionalParam('pldest3', 'The optional fourth destination PL')
  .addOptionalParam('to3', 'The optional fourth destination address')
  .addOptionalParam('amount3', 'The amount for the fourth destination')
  .addOptionalParam('callablesPath3', 'Path to a Json file, containing an array of callables for the fourth destination')
  .addOptionalParam('pldest4', 'The optional fifth destination PL')
  .addOptionalParam('to4', 'The optional fifth destination address')
  .addOptionalParam('amount4', 'The amount for the fifth destination')
  .addOptionalParam('callablesPath4', 'Path to a Json file, containing an array of callables for the fifth destination')
  .setAction(
    async (
      taskArgs: {
        symbol: string;
        plorigin: string;
        pldest: string;
        from: string;
        to: string;
        amount: string;
        callablesPath?: string;
        pldest1?: string;
        to1?: string;
        amount1?: string;
        callablesPath1?: string;
        pldest2?: string;
        to2?: string;
        amount2?: string;
        callablesPath2?: string;
        pldest3?: string;
        to3?: string;
        amount3?: string;
        callablesPath3?: string;
        pldest4?: string;
        to4?: string;
        amount4?: string;
        callablesPath4?: string;
      },
      hre
    ) => {
      const spinner = new Spinner();

      try {
        console.log('Setting up signer...');
        const rpcUrl = process.env[`RPC_URL_NODE_${taskArgs.plorigin}`];
        if (!rpcUrl) throw new Error(`Missing RPC URL for PL ${taskArgs.plorigin}.`);
        if (!hre.ethers.isAddress(taskArgs.from)) {
          throw new Error(`Invalid from address: "${taskArgs.from}"`);
        }

        const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
        const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
        const signer = wallet.connect(provider);

        console.log('Fetching token...');
        const token = await getEnygmaBySymbol(hre, taskArgs.plorigin, taskArgs.symbol);

        const destinations: string[] = [taskArgs.to];
        const amounts: number[] = [Number(taskArgs.amount)];
        const chainIds: number[] = [];
        const allCallables: SharedObjects.EnygmaCrossTransferCallableStruct[][] = [];

        if (taskArgs.callablesPath) {
          const parsedCallables: SharedObjects.EnygmaCrossTransferCallableStruct[] = JSON.parse(fs.readFileSync(taskArgs.callablesPath, "utf8"));
          if (parsedCallables.length > 5) {
            throw new Error(`Can only have up to 5 callables in callables parameter.`);
          }
          allCallables.push(parsedCallables)
        } else {
          allCallables.push([])
        }

        // Validate and add primary destination
        const primaryChainId = parseInt(process.env[`NODE_${taskArgs.pldest}_CHAIN_ID`] || '', 10);
        if (isNaN(primaryChainId)) {
          throw new Error(`Invalid destinationChainId for "${taskArgs.pldest}".`);
        }
        chainIds.push(primaryChainId);

        // Dynamically process additional destinations
        for (let i = 1; i <= 4; i++) {
          const pldestKey = `pldest${i}` as keyof typeof taskArgs;
          const destKey = `to${i}` as keyof typeof taskArgs;
          const amountKey = `amount${i}` as keyof typeof taskArgs;
          const callablesPathKey = `callablesPath${i}` as keyof typeof taskArgs;

          if (taskArgs[pldestKey] && taskArgs[destKey] && taskArgs[amountKey]) {
            const pldest = taskArgs[pldestKey] as string;
            const dest = taskArgs[destKey] as string;
            const amount = Number(taskArgs[amountKey]);
            const respectiveCallablesPath = taskArgs[callablesPathKey] as string;

            if (!hre.ethers.isAddress(dest)) {
              throw new Error(`Invalid destination address for ${destKey}: "${dest}"`);
            }

            if (isNaN(amount) || amount <= 0) {
              throw new Error(`Invalid amount for ${amountKey}: "${taskArgs[amountKey]}". Amount must be a positive number.`);
            }

            const chainId = parseInt(process.env[`NODE_${pldest}_CHAIN_ID`] || '', 10);
            if (isNaN(chainId)) {
              throw new Error(`Invalid destinationChainId for "${pldest}".`);
            }

            destinations.push(dest);
            amounts.push(amount);
            chainIds.push(chainId);

            if (respectiveCallablesPath) {
              const parsedCallables: SharedObjects.EnygmaCrossTransferCallableStruct[] = JSON.parse(fs.readFileSync(respectiveCallablesPath, "utf8"));

              if (parsedCallables.length > 5) {
                throw new Error(`Can only have up to 5 callables in "${callablesPathKey}" parameter.`);
              }
              allCallables.push(parsedCallables);
            } else {
              allCallables.push([])
            }
          }
        }

        console.log('Transaction details:');
        console.log('  plorigin:', taskArgs.plorigin);
        console.log('  destinations:', destinations);
        console.log('  amounts:', amounts);
        console.log('  chainIds:', chainIds);
        console.log('  callables:', allCallables);

        console.log('Checking balance...');
        const balance = await token.balanceOf(signer.address);
        console.log('Signer address:', signer.address);
        console.log(`Signer balance: ${balance}`);

        console.log('Sending transaction...');
        spinner.start();

        const tx = await token.connect(signer).crossTransferFrom(taskArgs.from, destinations, amounts, chainIds, allCallables);
        const receipt = await tx.wait();
        if (!receipt || receipt.status === 0) {
          throw new Error(`Transaction failed for token "${await token.name()}" (${await token.symbol()}).`);
        }

        console.log(`Transaction successful!`);
        console.log(`Hash: ${tx.hash}`);
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error);
      } finally {
        spinner.stop();
      }
    }
  );
