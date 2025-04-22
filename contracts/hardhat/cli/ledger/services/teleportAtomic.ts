import { RaylsClient } from '../../../utils/cfg/ethers';
import {
  ContractResolver,
  TokenContractTypes
} from '../../../utils/cfg/types/_contracts';
import type {
  ContractTransactionReceipt,
  ContractTransactionResponse
} from 'ethers';
import { Logger, Spinner } from '../../utils';
import { TokenStatus } from '../../operator/utils/tokenRegistry';
import { PrivacyLedgerClient } from '../../../utils/cfg/ethers/pl';

export async function teleportAtomic<T extends TokenContractTypes>(
  web3: RaylsClient,
  params: {
    plOrigin: string;
    plDest: string;
    tokenName: string;
    destinationAddress?: string;
    contractType: T;
    handler: (
      token: ContractResolver<T>,
      destinationAddress: string,
      destinationChainId: number
    ) => Promise<ContractTransactionResponse>;
  }
): Promise<ContractTransactionReceipt> {
  const {
    plOrigin,
    plDest,
    tokenName,
    destinationAddress,
    handler,
    contractType
  } = params;

  const spinner = await Spinner(
    `Teleporting token ${tokenName} from ${plOrigin} to ${plDest} (${destinationAddress || `Using Address Configured for PL ${plDest}`})...`
  );

  const originPl = web3.Pls.getPl(plOrigin);
  const dstPl = web3.Pls.getPl(plDest);

  const destinationChainId = dstPl.cfg.chainId;

  const token = await getTokenForTeleport(
    web3,
    originPl,
    tokenName,
    contractType
  );

  const dstAddress =
    destinationAddress || (await dstPl.signers[0].getAddress());

  const tx = await handler(token, dstAddress, destinationChainId);

  const res = await tx.wait();

  if (!res) {
    throw new Error('Transaction failed unexpectedly!');
  }

  spinner.succeed(`Transaction pushed on ${plOrigin}'s PL`);

  Logger.info(`PL ${plOrigin} Hash: ${tx.hash}`);

  return res;
}

async function getTokenForTeleport<T extends TokenContractTypes>(
  web3: RaylsClient,
  originPl: PrivacyLedgerClient, // Replace 'any' with proper PL type if available
  tokenName: string,
  contractType: T
) {
  const tokenData = web3.getAllTokens().find(({ name }) => name === tokenName);

  let resourceId = tokenData?.resourceId;
  let tokenAddress: string | null = null;

  // Find Token by name in TokenRegistry
  if (!resourceId) {
    const TokenRegistry = await web3.CommitChain.getContract('TokenRegistry');

    const tokenRegistryData = (await TokenRegistry.getAllTokens()).find(
      ({ name }) => name === tokenName
    );

    if (!tokenRegistryData?.resourceId)
      throw new Error(`Token ${tokenName} not submitted`);

    if (tokenRegistryData.status !== BigInt(TokenStatus.ACTIVE)) {
      throw new Error(`Token ${tokenName} is not active in the TokenRegistry`);
    }

    resourceId = tokenRegistryData.resourceId;

    // If token issuer is the current PL, then use the implementation address
    if (tokenRegistryData.issuerChainId === BigInt(originPl.cfg.chainId)) {
      tokenAddress = tokenRegistryData.issuerImplementationAddress;
    }
  }

  return tokenAddress
    ? await originPl.getTokenAt(contractType, tokenAddress)
    : await originPl.getTokenByResourceId(contractType, resourceId);
}
