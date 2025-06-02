import hre from 'hardhat';
import { getEthers } from '../../utils/cfg/ethers';
import { command, subcommands } from 'cmd-ts';
import {
  AddressesOption,
  ErcIdOption,
  FromWalletOption,
  SubmitOption,
  SymbolOption,
  TokenNameOption,
  destinationAddressOption,
  tokenNameOption
} from './utils/params';
import { envOption, plOption, plsOption } from '../params';
import { getBalances, logMultipleBalances } from './services/balances';
import { teleportAtomic } from './services/teleportAtomic';
import { Logger, Spinner } from '../utils';
import { deployToken } from './services/deploy';
import { getMetadata } from './services/metadata';
import { mintOrBurn } from './services/mint&burn';
import { transfer } from './services/transfer';

/**
 * Commands
 */

export const deployCommand = command({
  name: 'deploy',
  description: 'Deploys a Rayls ERC721 contract',
  args: {
    env: envOption,
    plName: plOption(),
    tokenName: tokenNameOption({
      defaultValue: () => `RaylsErc721_${Date.now()}`
    }),
    symbol: SymbolOption,
    submit: SubmitOption
  },
  handler: async ({ env, plName, tokenName, symbol, submit }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await deployToken(web3, {
      contractType: 'RaylsErc721Example',
      plName,
      submit,
      tokenName,
      handler: (_, token, endpointAddress) => {
        return token.deploy('url', tokenName, symbol, endpointAddress);
      }
    });
  }
});

export const submitCommand = command({
  name: 'submit',
  description: 'Submit a Rayls ERC721 contract to Ven',
  args: {
    env: envOption,
    plName: plOption(),
    tokenName: TokenNameOption
  },
  handler: async ({ env, plName, tokenName }) => {
    const spinner = await Spinner(
      `Submitting token registration on ${plName}...`
    );

    const web3 = await getEthers({ env, ethers: hre.ethers });

    const pl = web3.Pls.getPl(plName);

    const token = await pl.getTokenByType('RaylsErc721Example', tokenName);

    const resourceId = await token.resourceId();

    if (resourceId && (await web3.isAddressValid(resourceId))) {
      throw new Error('Token already submitted');
    }

    const tx = await token.submitTokenRegistration(0);

    await tx.wait();

    spinner.stop();

    Logger.info(`Token Registration Submitted`);
  }
});

export const mintCommand = command({
  name: 'mint',
  description: 'Mints NFT token to an address',
  args: {
    env: envOption,
    tokenName: TokenNameOption,
    ercId: ErcIdOption,
    address: destinationAddressOption()
  },
  handler: async ({ env, tokenName, ercId, address }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await mintOrBurn(web3, {
      tokenName,
      contractType: 'RaylsErc721Example',
      operation: 'MINT',
      address,
      amount: '1',
      ercId,
      handler: async (_, token, dstAddress) => token.mint(dstAddress, ercId)
    });
  }
});

export const burnCommand = command({
  name: 'burn',
  description: 'Burn NFT token',
  args: {
    env: envOption,
    tokenName: TokenNameOption,
    ercId: ErcIdOption
  },
  handler: async ({ env, tokenName, ercId }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await mintOrBurn(web3, {
      tokenName,
      contractType: 'RaylsErc721Example',
      operation: 'BURN',
      address: undefined,
      amount: '1',
      ercId,
      handler: async (_, token) => token.burn(ercId)
    });
  }
});

export const metadataCommand = command({
  name: 'metadata',
  description: 'Get the metadata of a Rayls ERC721 contract (name, resourceId)',
  args: {
    env: envOption,
    plName: plOption(),
    tokenName: TokenNameOption
  },
  handler: async ({ env, plName, tokenName }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await getMetadata(web3, {
      plName,
      contractType: 'RaylsErc721Example',
      tokenName,
      handler: async (_, token) => {
        const [name, resourceId] = await Promise.all([
          token.name(),
          token.resourceId()
        ]);

        return {
          name,
          resourceId
        };
      }
    });
  }
});

export const balanceCommand = command({
  name: 'balance',
  description: 'Check amount of an ERC721 token on a specific address',
  args: {
    env: envOption,
    plName: plOption(),
    tokenName: TokenNameOption,
    addresses: AddressesOption
  },
  handler: async (params) => {
    const { env, plName, tokenName } = params;
    const web3 = await getEthers({ env, ethers: hre.ethers });

    const addresses = params.addresses?.split?.(',');

    const balance = await getBalances(web3, {
      plName,
      tokenName,
      contractType: 'RaylsErc721Example',
      addresses,
      handler: async (_, token, address) => {
        const balance = await token.balanceOf(address);

        return balance;
      }
    });

    return balance;
  }
});

export const balancesCommand = command({
  name: 'balances',
  description:
    'Check the balance of an ERC721 token by Id on multiple PLs (DEV ONLY!)',
  args: {
    env: envOption,
    pls: plsOption(),
    tokenName: TokenNameOption,
    addressesToCheck: AddressesOption
  },
  handler: async ({ env, pls, tokenName, addressesToCheck }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    const plsArr = pls?.split?.(',') || web3.Pls.getPlNames();

    const addresses = addressesToCheck?.split?.(',');

    await logMultipleBalances(web3, {
      pls: plsArr,
      addresses,
      tokenName,
      contractType: 'RaylsErc721Example',
      handler: async (pl, token, address) => {
        const balance = await token.balanceOf(address);

        return balance;
      }
    });
  }
});

export const transferCommand = command({
  name: 'transfer',
  description: 'Transfers a token from one address to another',
  args: {
    env: envOption,
    plName: plOption(),
    tokenName: TokenNameOption,
    ercId: ErcIdOption,
    from: FromWalletOption,
    to: destinationAddressOption()
  },
  handler: async ({ env, plName, tokenName, ercId, to, from }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await transfer(web3, {
      plName,
      tokenName,
      amount: 1,
      ercId,
      fromPrivateKey: from,
      destinationAddress: to,
      contractType: 'RaylsErc721Example',
      handler: async (pl, token, destinationAddress) =>
        token.transferFrom(pl.signers[0], destinationAddress, ercId)
    });
  }
});

export const teleportAtomicCommand = command({
  name: 'teleport-atomic',
  description: 'Teleport an ERC721 token to another PL',
  args: {
    env: envOption,
    plOrigin: plOption({ long: 'pl-origin' }),
    plDest: plOption({ long: 'pl-dest' }),
    tokenName: TokenNameOption,
    ercId: ErcIdOption,
    destinationAddress: destinationAddressOption()
  },
  handler: async ({
    env,
    plOrigin,
    plDest,
    tokenName,
    ercId,
    destinationAddress
  }) => {
    Logger.info('Sending transaction...');

    const web3 = await getEthers({ env, ethers: hre.ethers });

    await teleportAtomic(web3, {
      plOrigin,
      plDest,
      tokenName,
      contractType: 'RaylsErc721Example',
      destinationAddress,
      handler: async (token, destinationAddress, destinationChainId) => {
        return await token.teleportAtomic(
          destinationAddress,
          ercId,
          destinationChainId
        );
      }
    });
  }
});
