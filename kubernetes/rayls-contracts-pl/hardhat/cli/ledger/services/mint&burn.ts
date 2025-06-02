import { RaylsClient } from '../../../utils/cfg/ethers';
import { PrivacyLedgerClient } from '../../../utils/cfg/ethers/pl';
import {
  ContractResolver,
  TokenContractTypes
} from '../../../utils/cfg/types/_contracts';
import { Logger, Spinner } from '../../utils';
import type { ContractTransactionResponse } from 'ethers';

export async function mintOrBurn<T extends TokenContractTypes>(
  web3: RaylsClient,
  params: {
    operation: 'MINT' | 'BURN';
    contractType: T;
    tokenName: string;
    address: string | undefined;
    amount: string | number | bigint;
    ercId: string | number | undefined;

    handler: (
      pl: PrivacyLedgerClient,
      token: ContractResolver<T>,
      destinationAddress: string
    ) => Promise<ContractTransactionResponse>;
  }
) {
  const { contractType, handler, tokenName } = params;

  const tokenData = web3.getAllTokens().find(({ name }) => name === tokenName);

  if (!tokenData) {
    Logger.error(`Token ${tokenName} not found in the config`);

    return;
  }
  const { plName } = tokenData;

  const spinner = await Spinner(
    `${params.operation}ing token ${tokenName} on ${plName}...`
  );

  const pl = web3.Pls.getPl(tokenData.plName);

  const token = await pl.getTokenByType(contractType, tokenName);

  const dstAddress = params.address || (await pl.signers[0].getAddress());

  const res = await (await handler(pl, token, dstAddress)).wait();

  spinner.succeed('Operation completed');

  Logger.info(
    `${params.operation}ed ${params.ercId !== undefined ? `(ID: ${params.ercId}) ` : ''}${params.amount} ${tokenName} on ${plName}`
  );

  return res;
}
