import { RaylsClient } from '../../../utils/cfg/ethers';
import { PrivacyLedgerClient } from '../../../utils/cfg/ethers/pl';
import {
  ContractResolver,
  TokenContractTypes
} from '../../../utils/cfg/types/_contracts';
import {
  ErcStandard,
  ercStandardToContractType
} from '../../operator/utils/tokenRegistry';
import { Logger, Spinner } from '../../utils';
import { Err, Ok, Result } from '../../../utils/fp';
import { TokenRegistryV1 } from '../../../../typechain-types';

type BalanceResult = Result<
  { address: string; balance: bigint },
  { address: string; error: unknown }
>;

type PlBalanceResults = Result<
  {
    plName: string;
    balances: BalanceResult[];
  },
  {
    plName: string;
    error: unknown;
  }
>;

type Balances = {
  data: { Pl: string; Address: string; Balance: bigint }[];
  failed: { plName: string; error: unknown }[];
};

export async function logMultipleBalances<T extends TokenContractTypes>(
  web3: RaylsClient,
  data: {
    pls: string[];
    addresses?: string[];
    tokenName: string;
    contractType: T;
    shouldLog?: false;
    handler: (
      pl: PrivacyLedgerClient,
      token: ContractResolver<T>,
      address: string
    ) => Promise<bigint>;
  }
): Promise<Balances | null> {
  const { pls, tokenName, handler, contractType, shouldLog = true } = data;

  const spinner = await Spinner(
    `Getting balances of ${tokenName} on Pls ${pls.join(', ')}...`
  );

  try {
    const TokenRegistry = await web3.CommitChain.getContract('TokenRegistry');

    if (!web3.configs.deployments?.PLs) {
      throw new Error('No PLs found in deployment config');
    }

    const tokenData = (await TokenRegistry.getAllTokens()).find(
      ({ name }) => name === tokenName
    );

    if (!tokenData) {
      throw new Error(`Token ${tokenName} not found`);
    }

    const addresses = data.addresses || web3.getAllWallets();

    const plBalancesResult = await Promise.all(
      pls.map<Promise<PlBalanceResults>>(async (plName) => {
        try {
          const pl = web3.Pls.getPl(plName);

          const token = await getTokenForPl(web3, {
            pl,
            contractType,
            tokenName,
            tokenData
          });

          const registeredAddresses = new Set();

          const balances = await Promise.all(
            addresses.map<Promise<BalanceResult | null>>(async (addr) => {
              const { address, name } = await resolveAddress(addr);

              if (registeredAddresses.has(address)) {
                return null;
              }
              registeredAddresses.add(address);

              try {
                return Ok({
                  address: name,
                  balance: await handler(pl, token, address)
                });
              } catch (error) {
                return Err({
                  address,
                  error
                });
              }
            })
          );

          const isIssuer = BigInt(pl.cfg.chainId) === tokenData.issuerChainId;

          return Ok({
            plName: (isIssuer ? '(Issuer PL) ' : '') + plName,
            balances: balances.filter(Boolean) as BalanceResult[]
          });
        } catch (error) {
          return Err({
            plName,
            error
          });
        }
      })
    );

    const balances = mapBalanceResults(plBalancesResult);

    if (balances.failed.length > 0) {
      balances.failed.forEach((err) => {
        Logger.debug({ err: err.error }, `Error on ${err.plName}:`);
      });
    }

    if (balances.data.length === 0) {
      spinner.fail('No balances found');

      return null;
    } else {
      spinner.succeed('Balances retrieved');
    }

    if (shouldLog) {
      Logger.info(`Token "${tokenName}" balances!`);

      // eslint-disable-next-line no-console
      console.table(balances.data);
    }

    return balances;
  } catch (error) {
    Logger.error(error, 'Error retrieving balances');

    return null;
  }
}

export async function getBalances<T extends TokenContractTypes>(
  web3: RaylsClient,
  data: {
    plName: string;
    addresses?: string[];
    tokenName: string;
    contractType: T;
    shouldLog?: false;
    handler: (
      pl: PrivacyLedgerClient,
      token: ContractResolver<T>,
      address: string
    ) => Promise<bigint>;
  }
) {
  const { plName, handler, tokenName, contractType, shouldLog = true } = data;
  const pl = web3.Pls.getPl(plName);

  // If token is not found in local config, gets it from the TokenRegistry
  const token =
    (await pl.getTokenByType(contractType, tokenName).catch(() => null)) ||
    (await getTokenForPl(web3, {
      pl,
      contractType,
      tokenName
    }));

  const addresses = data.addresses || web3.getAllWallets();

  const registeredAddresses = new Set();

  const result = (
    await Promise.all(
      addresses.map<Promise<BalanceResult | null>>(async (addr) => {
        const { address, name } = await resolveAddress(addr);

        if (registeredAddresses.has(address)) {
          return null;
        }
        registeredAddresses.add(address);

        try {
          return Ok({
            address: name,
            balance: await handler(pl, token, address)
          });
        } catch (error) {
          return Err({
            address,
            error
          });
        }
      })
    )
  ).filter((x): x is BalanceResult => Boolean(x));

  const balanceResult: PlBalanceResults = Ok({ plName, balances: result });
  const balances = mapBalanceResults([balanceResult]);

  if (balances.failed.length > 0) {
    balances.failed.forEach((err) => {
      Logger.debug({ err: err.error }, `Error on ${err.plName}:`);
    });
  }

  if (shouldLog) {
    Logger.info(`Token "${tokenName}" balances!`);

    // eslint-disable-next-line no-console
    console.table(balances.data);
  }

  return balances;
}

/**
 * Utils
 */

async function resolveAddress(
  addr: string | ReturnType<RaylsClient['getAllWallets']>[number]
): Promise<{
  name: string;
  address: string;
}> {
  if (typeof addr === 'string') return { name: addr, address: addr };

  const address = await addr.signer.getAddress().catch(() => addr.plName);

  return {
    name: typeof addr === 'string' ? addr : `(${addr.plName}) ${address}`,
    address
  };
}

/**
 * Gets the token for the given PL
 */
async function getTokenForPl<T extends TokenContractTypes>(
  web3: RaylsClient,
  data: {
    pl: PrivacyLedgerClient;
    contractType: T;
    tokenName: string;
    tokenData?: TokenRegistryV1.TokenStructOutput;
  }
) {
  const { contractType, tokenName, pl } = data;

  const tokenData =
    data.tokenData ||
    (await web3.CommitChain.getContract('TokenRegistry').then(
      async (tokenRegistry) => {
        const allTokens = await tokenRegistry.getAllTokens();

        return allTokens.find(({ name }) => name === tokenName);
      }
    ));

  if (!tokenData) {
    throw new Error(`Token ${tokenName} not found`);
  }

  const standardContractType = ercStandardToContractType(tokenData.ercStandard);

  // Check if the token is of the correct standard being requested
  if (standardContractType !== contractType) {
    throw new Error(
      `Token ${tokenName} is not of standard ${ErcStandard[parseInt(tokenData.ercStandard.toString())]}`
    );
  }

  const isIssuer = BigInt(pl.cfg.chainId) === tokenData.issuerChainId;

  return isIssuer
    ? await pl.getTokenAt(contractType, tokenData.issuerImplementationAddress)
    : await pl.getTokenByResourceId(contractType, tokenData.resourceId);
}

function mapBalanceResults(results: PlBalanceResults[]): Balances {
  return results.reduce<Balances>(
    (acc, plResult) => {
      if (plResult.isErr) {
        return {
          ...acc,
          failed: [
            ...acc.failed,
            { plName: plResult.err.plName, error: plResult.err.error }
          ]
        };
      }

      const { plName, balances } = plResult.data;

      return balances.reduce<Balances>((acc, balance) => {
        if (balance.isErr) {
          return {
            ...acc,
            failed: [...acc.failed, { plName, error: balance.err }]
          };
        }

        return {
          ...acc,
          data: [
            ...acc.data,
            {
              Pl: plName,
              Address: balance.data.address,
              Balance: balance.data.balance
            }
          ]
        };
      }, acc);
    },
    { data: [], failed: [] }
  );
}
