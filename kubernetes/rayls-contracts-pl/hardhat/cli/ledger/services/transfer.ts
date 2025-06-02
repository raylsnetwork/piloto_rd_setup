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
import { PrivacyLedgerClient } from '../../../utils/cfg/ethers/pl';

export async function transfer<T extends TokenContractTypes>(
  web3: RaylsClient,
  params: {
    plName: string;
    tokenName: string;
    destinationAddress?: string;
    fromPrivateKey?: string;
    contractType: T;
    amount: bigint | number;
    ercId: undefined | string | bigint | number;
    handler: (
      pl: PrivacyLedgerClient,
      token: ContractResolver<T>,
      destinationAddress: string
    ) => Promise<ContractTransactionResponse>;
  }
): Promise<ContractTransactionReceipt> {
  const { plName, tokenName, fromPrivateKey, contractType, handler } = params;

  const Pl = await web3.Pls.getPl(plName);

  const signer = fromPrivateKey ? Pl.getSigner(fromPrivateKey) : Pl.signers[0];

  const destinationAddress =
    params.destinationAddress || (await Pl.signers[1]?.getAddress?.());

  if (!destinationAddress) {
    throw new Error(
      'Destination address is required. No secondary signer found in the config'
    );
  }

  const signerAddr = await signer.getAddress();

  if (destinationAddress === signerAddr) {
    throw new Error('Cannot transfer to the same address');
  }

  Logger.info(
    `Transferring ${params.amount} tokens from ${signerAddr} to ${destinationAddress}`
  );

  const spinner = await Spinner(`Transferring token...`);

  const tokenContract = await Pl.getTokenByType(
    contractType,
    tokenName,
    signer
  );

  Logger.info(
    `Transferring ${params.ercId ? `(ID: ${params.ercId}) ` : ''}${params.amount} tokens from ${signerAddr} to ${destinationAddress}`
  );

  const tx = await handler(Pl, tokenContract, destinationAddress);

  spinner.text = 'Waiting for transaction to be mined...';
  spinner.color = 'yellow';

  const res = await tx.wait();

  if (!res) {
    spinner.fail('Transaction failed unexpectedly!');
    throw new Error('Transaction failed unexpectedly!');
  }

  spinner.succeed('Transaction mined successfully');

  return res;
}
