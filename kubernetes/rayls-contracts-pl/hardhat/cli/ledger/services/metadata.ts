import { RaylsClient } from '../../../utils/cfg/ethers';
import { PrivacyLedgerClient } from '../../../utils/cfg/ethers/pl';
import {
  ContractResolver,
  TokenContractTypes
} from '../../../utils/cfg/types/_contracts';
import { Logger, Spinner } from '../../utils';

export async function getMetadata<
  T extends TokenContractTypes,
  M extends {
    resourceId: string | undefined;
  } & Record<string, unknown>
>(
  web3: RaylsClient,
  params: {
    plName: string;
    tokenName: string;
    contractType: T;

    handler: (
      pl: PrivacyLedgerClient,
      token: ContractResolver<T>
    ) => Promise<M>;
  }
) {
  const { contractType, handler, plName, tokenName } = params;

  const spinner = await Spinner(
    `Getting metadata of ${tokenName} on ${plName}...`
  );

  const pl = web3.Pls.getPl(plName);

  const token = await pl.getTokenByType(contractType, tokenName);

  const metadata = await handler(pl, token);

  spinner.succeed('Metadata retrieved');

  Logger.info({ metadata }, `Metadata of ${tokenName}:`);

  const { resourceId } = metadata;

  if (!resourceId || !isResourceIdValid(resourceId)) return;

  const isResourceIdSet = pl.deploymentsCfg?.tokens.some(
    ({ name, resourceId: rId }) => name === tokenName && resourceId === rId
  );

  if (isResourceIdSet) return;

  Logger.info('Saving resourceId on PL config...');

  const tokenAddress = await token.getAddress();

  await web3.setPlConfig(plName, (plCfg) => {
    if (!plCfg) {
      throw new Error('No PL config found, could not save');
    }

    return {
      ...plCfg,
      tokens: plCfg.tokens.map((t) => {
        if (t.address !== tokenAddress) return t;

        return {
          ...t,
          resourceId
        };
      })
    };
  });

  return metadata;
}

function isResourceIdValid(
  resourceId: string,
  ignoreZeroAddress = false
): boolean {
  const isValid = resourceId.length === 66 && resourceId.startsWith('0x');

  if (!isValid) return false;

  if (ignoreZeroAddress) return true;

  const isZeroAddress = /^0x0+$/.test(resourceId);

  return !isZeroAddress;
}
