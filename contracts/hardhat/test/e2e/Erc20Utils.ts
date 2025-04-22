import axios from 'axios';
import hre from 'hardhat';
import { ethers } from 'ethers';

import { genRanHex } from "../../tasks/deployToken";
import { EndpointV1, TokenExample, TokenRegistryV1 } from '../../../typechain-types';
import { pollCondition } from './Utils';
import { TokenExampleEthersContract } from '../../utils/TokenExampleEthersContract';

export function generateTokenInfo() {
    const randHex = `0x${genRanHex(6)}`;
    const tokenName = `Token ${randHex}`;
    const tokenSymbol = `T_${randHex}`;

    return {
        tokenName,
        tokenSymbol
    }
}

export async function deployERC20Token(signer: ethers.HDNodeWallet, endpointAddress: string) {
    const { tokenName, tokenSymbol } = generateTokenInfo();
    const TokenFactory = await hre.ethers.getContractFactory('TokenExample', signer);
    const Token = await TokenFactory.deploy(tokenName, tokenSymbol, endpointAddress);

    await Token.waitForDeployment();

    return Token;
}

export async function setupERC20SingleToken(signer: ethers.Wallet, endpointAddress: string, TokenRegistry: TokenRegistryV1, setupTimeout: [number, number]) {
    // const Token = await deployERC20Token(signer, endpointAddress);
    const { tokenName, tokenSymbol } = generateTokenInfo();
    const TokenFactory = await hre.ethers.getContractFactory('TokenExample', signer);
    const Token = await TokenFactory.deploy(tokenName, tokenSymbol, endpointAddress);

    await Token.waitForDeployment();

    const tokenAddress = await Token.getAddress();
    const txRegistered = await Token.submitTokenRegistration(4);
    await txRegistered.wait();

    const resourceId = await pollUntilTokenRegistered(TokenRegistry, tokenName, setupTimeout);

    if (!resourceId) { throw new Error('Token not registered'); }

    const txApproved = await TokenRegistry.updateStatus(resourceId, 1, { gasLimit: 5000000 });
    await txApproved.wait();

    const isApproved = await pollUntilTokenApproved(Token, setupTimeout);

    if (!isApproved) { throw new Error('Token not approved'); }

    return {
        Token,
        tokenAddress,
        resourceId
    }
}

export async function setupERC20BatchToken(signer: ethers.Wallet, endpointAddress: string, TokenRegistry: TokenRegistryV1, setupTimeout: [number, number]) {
    const { tokenName, tokenSymbol } = generateTokenInfo();
    const BatchTokenFactory = await hre.ethers.getContractFactory("Erc20BatchTeleport", signer);
    const BatchToken = await BatchTokenFactory.connect(signer).deploy(tokenName, tokenSymbol, endpointAddress);

    await BatchToken.waitForDeployment();
    await BatchToken.submitTokenRegistration(4);

    const tokenAddress = await BatchToken.getAddress();
    const txRegistered = await BatchToken.submitTokenRegistration(4);
    await txRegistered.wait();

    const resourceId = await pollUntilTokenRegistered(TokenRegistry, tokenName, setupTimeout);

    if (!resourceId) { throw new Error('Token not registered'); }

    const txApproved = await TokenRegistry.updateStatus(resourceId, 1, { gasLimit: 5000000 });
    await txApproved.wait();

    const isApproved = await pollUntilTokenApproved(BatchToken, setupTimeout);

    if (!isApproved) { throw new Error('Token not approved'); }

    return {
        BatchToken,
        tokenAddress,
        resourceId
    }
}

export async function pollUntilBalanceUpdated(token: Pick<TokenExample, 'balanceOf'>, address: string, expectedBalance: bigint, timeout: [number, number]) {
    return await pollCondition(async (): Promise<boolean> => {
        const balance = await token.balanceOf(address);
        return balance === expectedBalance;
    }, ...timeout);
}

export async function pollUntilTokenDeployed(endpoint: EndpointV1, resourceId: string, timeout: [number, number]) {
    return await pollCondition(async (): Promise<boolean> => {
        const tokenAddress = await endpoint.resourceIdToContractAddress(resourceId);
        if (tokenAddress !== ethers.ZeroAddress) {
            return true;
        }
        return false;
    }, ...timeout);
}

export async function pollUntilTokenApproved(token: Pick<TokenExample, 'resourceId'>, timeout: [number, number]) {
    return pollCondition(async (): Promise<boolean> => {
        const resourceId = await token.resourceId();
        if (resourceId !== ethers.ZeroHash) {
            return true;
        }
        return false;
    }, ...timeout);
}

export async function pollUntilTokenRegistered(registry: TokenRegistryV1, tokenName: string, timeout: [number, number]): Promise<string | null> {
    let resourceId: string | null = null;

    await pollCondition(async () => {
        const allTokens = await registry.getAllTokens();
        const tokenOnCC = allTokens.find((x) => x.name === tokenName);
        if (tokenOnCC) {
            resourceId = tokenOnCC.resourceId;
        }
        return resourceId !== null;
    }, ...timeout);

    return resourceId;
}

export async function sendTokensInBulk(
    ethersContractSender: TokenExampleEthersContract,
    totalTxCount: number,
    amount: number,
    currentNonce: number,
    isAtomic: boolean,
    rpcUrl: string,
    destAddress: string,
    destChainId: string,
): Promise<{
    "jsonrpc": string,
    "id": number,
    "result": string
}[]> {
    // Generate batch transactions
    const transactions: string[] = [];
    for (let i = 0; i < totalTxCount; i++) {
        if (!ethersContractSender) {
            throw new Error('ethersContractSender is not initialized');
        }

        let signedTx;
        if (isAtomic) {
            signedTx = await ethersContractSender.populateSignedTeleportAtomic(destAddress, amount, destChainId, currentNonce);
        } else {
            signedTx = await ethersContractSender.populateSignedTeleport(destAddress, amount, destChainId, currentNonce);
        }

        transactions.push(signedTx);
        currentNonce++;
    }
    // Prepare and send batch request
    const batchRequest = `[${transactions
        .map((tx, index) =>
            JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_sendRawTransaction',
                params: [tx],
                id: index + 1
            })
        )
        .join(',')}]`;

    try {
        const response = await axios.post(rpcUrl, batchRequest, {
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.status !== 200) {
            throw new Error(`Error sending batch transactions: ${response.data}`);
        }

        return response.data as {
            "jsonrpc": string,
            "id": number,
            "result": string
        }[];
    } catch (error) {
        throw error;
    }
}