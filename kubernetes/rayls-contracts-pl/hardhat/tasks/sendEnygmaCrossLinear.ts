import { task } from 'hardhat/config';
import { Spinner } from '../utils/spinner';
import { getEnygmaBySymbol } from './checkTokenAllChains';


task('sendEnygmaCrossLinear', 'Sends enygma from one private ledger to another')
    .addParam('symbol', 'The token symbol')
    .addParam('plorigin', 'The origin PL (e.g., A, B, C, D, BACEN, TREASURY)')
    .addParam('pldest', 'The destination PL (e.g., A, B, C, D, BACEN, TREASURY)')
    .addParam('to', 'The destination address')
    .addParam('amount', 'The amount to be transferred')
    .addOptionalParam('callableResourceId', 'The resource ID for the callable (use 0x0 if using contractAddress)')
    .addOptionalParam('callableContractAddress', 'The contract address for the callable (use 0x0 if using resourceId)')
    .addOptionalParam('callablePayload', 'The payload to be executed')
    .setAction(
        async (
            taskArgs: {
                symbol: string;
                plorigin: string;
                pldest: string;
                to: string;
                amount: string;
                callableResourceId?: string;
                callableContractAddress?: string;
                callablePayload?: string;
            },
            hre
        ) => {
            const spinner = new Spinner();

            try {
                console.log('Setting up signer...');
                const rpcUrl = process.env[`RPC_URL_NODE_${taskArgs.plorigin}`];
                if (!rpcUrl) throw new Error(`Missing RPC URL for PL ${taskArgs.plorigin}.`);

                const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
                console.log('rpc -->', rpcUrl);
                const wallet = new hre.ethers.Wallet(process.env['PRIVATE_KEY_SYSTEM'] as string);
                const signer = wallet.connect(provider);

                console.log('Fetching token...');
                const token = await getEnygmaBySymbol(hre, taskArgs.plorigin, taskArgs.symbol);
                console.log('token -->', await token.symbol());
                // Validate destination address
                if (!hre.ethers.isAddress(taskArgs.to)) {
                    throw new Error(`Invalid destination address: "${taskArgs.to}"`);
                }

                // Validate amount
                const amount = Number(taskArgs.amount);
                if (isNaN(amount) || amount <= 0) {
                    throw new Error(`Invalid amount: "${taskArgs.amount}". Amount must be a positive number.`);
                }

                // Get destination chain ID
                const chainId = parseInt(process.env[`NODE_${taskArgs.pldest}_CHAIN_ID`] || '', 10);
                if (isNaN(chainId)) {
                    throw new Error(`Invalid destinationChainId for "${taskArgs.pldest}".`);
                }

                // Validate callable parameters
                let resourceId: string = '0x0';
                let contractAddress: string = '0x0';
                let payload: string = '0x';

                if (taskArgs.callableResourceId || taskArgs.callableContractAddress) {
                    if (taskArgs.callableResourceId && taskArgs.callableContractAddress) {
                        throw new Error('Cannot specify both resourceId and contractAddress for the callable');
                    }

                    resourceId = taskArgs.callableResourceId || hre.ethers.ZeroAddress;
                    contractAddress = taskArgs.callableContractAddress || hre.ethers.ZeroAddress;
                    payload = taskArgs.callablePayload || '0x';
                }

                console.log('Transaction details:');
                console.log('  plorigin:', taskArgs.plorigin);
                console.log('  destination:', taskArgs.to);
                console.log('  amount:', amount);
                console.log('  chainId:', chainId);
                console.log('  callable:');
                console.log('    resourceId:', resourceId);
                console.log('    contractAddress:', contractAddress);
                console.log('    payload:', payload);


                console.log('Checking balance...');
                const balance = await token.balanceOf(signer.address);
                console.log('Signer address:', signer.address);
                console.log(`Signer balance: ${balance}`);

                console.log('Sending transaction...');
                spinner.start();

                const tx = await token.connect(signer).linearCrossTransfer(
                    taskArgs.to,
                    amount,
                    chainId,
                    resourceId,
                    contractAddress,
                    payload
                );

                const receipt = await tx.wait();
                if (!receipt || receipt.status === 0) {
                    throw new Error(`Transaction failed for token "${await token.name()}" (${await token.symbol()}).`);
                }

                console.log(`Transaction successful!`);
                console.log(`Hash: ${tx.hash}`);
            } catch (error) {
                console.log('error -->', error);
                console.error('Error:', error instanceof Error ? error.message : error);
            } finally {
                spinner.stop();
            }
        }
    );