import { task } from 'hardhat/config';
import { Spinner } from '../utils/spinner';
import { ethers } from 'ethers';
import fs from 'fs';
import axios from 'axios';

import { BigNumber } from '@ethersproject/bignumber';
import { Contract } from '@ethersproject/contracts';
import { Wallet } from '@ethersproject/wallet';
import { network } from 'hardhat';

// npx hardhat sendBatchTokens --pl-origin A --pl-dest B --token MYTOKEN --destination-address 0xf9260c378ea6e428a79eafe443bd24ea09af8bc9 --amount 1 --total-transactions 1000
task('sendBatchTokens', 'Sends a token from one private ledger to the other one')
  .addParam('token', 'The token symbol')
  .addParam('plOrigin', 'The origin PL (ex: A, B, C, D, BACEN, TREASURY)')
  .addParam('plDest', 'The destination PL (ex: A, B, C, D, BACEN, TREASURY)')
  .addParam('destinationAddress', 'The destination Address')
  .addParam('amount', 'The amount to be transfered')
  .addParam('totalTransactions', 'The total tx to be sent over to the other PL')
  .setAction(async (taskArgs, hre) => {
    const spinner: Spinner = new Spinner();
    console.log('Sending transaction...');
    spinner.start();

    let totalTxInt = parseInt(taskArgs.totalTransactions);
    const destinationChainId = process.env[`NODE_${taskArgs.plDest}_CHAIN_ID`] as string;
    const rpcUrl = process.env[`RPC_URL_NODE_${taskArgs.plOrigin}`];

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
    const wallet1 = new ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
    const signer = new ethers.Wallet(wallet1.signingKey, provider);
    const network = await provider.getNetwork();

    const resourceId = process.env[`TOKEN_${taskArgs.token}_RESOURCE_ID`] as string;

    // TODO: change to TokenExampleEthersContract class when it is tested
    var jsonFile = fs.readFileSync('artifacts/src/rayls-protocol/test-contracts/TokenExample.sol/TokenExample.json');
    var abi = JSON.parse(jsonFile.toString());

    const endpoint = await hre.ethers.getContractAt('EndpointV1', process.env[`NODE_${taskArgs.plOrigin}_ENDPOINT_ADDRESS`] as string, signer);
    const tokenAddress = await endpoint.resourceIdToContractAddress(resourceId);

    const contract = new Contract(tokenAddress, abi.abi, wallet);

    const [owner] = await hre.ethers.getSigners();
    console.log(`From: ${await owner.getAddress()}`);

    let currentNonce = await signer.getNonce();
    console.log(`Current nonce: ${currentNonce}`);
    const transactions = []; // Array to store all transaction promises

    // const tx = await token.teleportAtomic(taskArgs.destinationAddress as string, taskArgs.amount, destinationChainId);
    for (let i = 0; i < totalTxInt; i++) {
      const tx = await contract.populateTransaction.teleportAtomic(taskArgs.destinationAddress as string, taskArgs.amount, destinationChainId);

      tx.from = wallet.address;
      tx.nonce = currentNonce;
      tx.gasPrice = BigNumber.from(0);
      tx.gasLimit = BigNumber.from(5000000);
      tx.chainId = Number(network.chainId);

      const signedTx = await wallet.signTransaction(tx);
      transactions.push(signedTx);
      currentNonce++;
    }

    console.log(`Generated ${transactions.length} signed transactions.`);

    // Prepare and send all transactions in a single batch
    let singleRequests = transactions
      .map((tx, index) =>
        JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_sendRawTransaction',
          params: [tx],
          id: index + 1
        })
      )
      .join(',\n');

    const batchRequest = `[${singleRequests}]`;

    console.log(`Sending all ${transactions.length} transactions in a single batch...`);

    try {
      // @ts-ignore
      const response = await axios.post(rpcUrl, batchRequest, {
        headers: { 'Content-Type': 'application/json' }
      });

      spinner.stop();
      console.log('All transactions sent successfully.');
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      spinner.stop();
      console.error('Failed to send transactions:', error.message);
      if (error.response) {
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
    }
  });
