import hre from 'hardhat';
import { getEthers } from '../../utils/cfg/ethers';
import { command, string, subcommands } from 'cmd-ts';
import { envOption, plOption, plsOption } from '../params';
import {
  AddressesOption,
  AmountOption,
  FromWalletOption,
  SubmitOption,
  SymbolOption,
  TokenNameOption,
  destinationAddressOption,
  tokenNameOption
} from './utils/params';
import { getBalances, logMultipleBalances } from './services/balances';
import { teleportAtomic } from './services/teleportAtomic';
import { Spinner } from '../utils';
import { deployToken } from './services/deploy';
import { getMetadata } from './services/metadata';
import { mintOrBurn } from './services/mint&burn';
import { transfer } from './services/transfer';

/**
 * Commands
 */

export const deployCommand = command({
  name: 'deploy',
  description: 'Deploys a Rayls ERC20 contract',
  args: {
    env: envOption,
    plName: plOption(),
    tokenName: tokenNameOption({
      defaultValue: () => `RaylsErc20_${Date.now()}`
    }),
    symbol: SymbolOption,
    submit: SubmitOption
  },
  handler: async ({ env, plName, tokenName, symbol, submit }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await deployToken(web3, {
      contractType: 'TokenExample',
      plName,
      submit,
      tokenName,
      handler: (_, token, endpointAddress) =>
        token.deploy(tokenName, symbol, endpointAddress)
    });
  }
});

export const submitCommand = command({
  name: 'submit',
  description: 'Submits a token registration',
  args: {
    env: envOption,
    plName: plOption(),
    tokenName: TokenNameOption
  },
  handler: async ({ env, plName, tokenName }) => {
    const spinner = await Spinner(
      `Submitting token registration on ${plName}...`
    );

    spinner.start();

    const web3 = await getEthers({ env, ethers: hre.ethers });

    const pl = web3.Pls.getPl(plName);

    const tokenContract = await pl.getTokenByType('TokenExample', tokenName);

    const resourceId = await tokenContract.resourceId();

    if (resourceId) {
      throw new Error('Token already submitted');
    }

    const tx = await tokenContract.submitTokenRegistration(0);

    await tx.wait();

    spinner.succeed(
      `Token Registration Submitted, wait until relayer retrieves the generated resource`
    );
  }
});

export const mintCommand = command({
  name: 'mint',
  description: 'Mints tokens to an address',
  args: {
    env: envOption,
    tokenName: TokenNameOption,
    amount: AmountOption,
    address: destinationAddressOption()
  },
  handler: async ({ env, tokenName, amount, address }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await mintOrBurn(web3, {
      tokenName,
      contractType: 'TokenExample',
      operation: 'MINT',
      address,
      amount,
      ercId: undefined,
      handler: async (_, token, dstAddress) => token.mint(dstAddress, amount)
    });
  }
});

export const burnCommand = command({
  name: 'burn',
  description: 'Burns tokens from an address',
  args: {
    env: envOption,
    tokenName: TokenNameOption,
    amount: AmountOption,
    address: destinationAddressOption()
  },
  handler: async ({ env, tokenName, amount, address }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await mintOrBurn(web3, {
      tokenName,
      contractType: 'TokenExample',
      operation: 'BURN',
      address,
      amount,
      ercId: undefined,
      handler: async (_, token, dstAddress) => token.burn(dstAddress, amount)
    });
  }
});

export const metadataCommand = command({
  name: 'metadata',
  description:
    'Retrieves the metadata of an ERC20 token (name, symbol, resourceId)',
  args: {
    env: envOption,
    plName: plOption(),
    tokenName: TokenNameOption
  },
  handler: async ({ env, plName, tokenName }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await getMetadata(web3, {
      plName,
      contractType: 'TokenExample',
      tokenName,
      handler: async (_, token) => {
        const [name, symbol, resourceId] = await Promise.all([
          token.name(),
          token.symbol(),
          token.resourceId()
        ]);

        return {
          name,
          symbol,
          resourceId
        };
      }
    });
  }
});

export const balanceCommand = command({
  name: 'balance',
  description: 'Check the balance of an ERC20 token on a specific address',
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
      contractType: 'TokenExample',
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
    'Check the balance of an ERC20 token on multiple Pls (DEV ONLY!)',
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
      contractType: 'TokenExample',
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
    amount: AmountOption,
    from: FromWalletOption,
    to: destinationAddressOption()
  },
  handler: async ({ env, plName, tokenName, amount, to, from }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await transfer(web3, {
      plName,
      tokenName,
      amount,
      ercId: undefined,
      fromPrivateKey: from,
      destinationAddress: to,
      contractType: 'TokenExample',
      handler: async (_, token, destinationAddress) =>
        token.transfer(destinationAddress, amount)
    });
  }
});

export const teleportAtomicCommand = command({
  name: 'teleport-atomic',
  description: 'Teleport a token from one PL to another',
  args: {
    env: envOption,
    tokenName: TokenNameOption,
    plOrigin: plOption({ long: 'pl-origin' }),
    plDest: plOption({ long: 'pl-dest' }),
    destinationAddress: destinationAddressOption(),
    amount: AmountOption
  },
  handler: async ({
    env,
    tokenName,
    plOrigin,
    plDest,
    amount,
    destinationAddress
  }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await teleportAtomic(web3, {
      plOrigin,
      plDest,
      tokenName,
      contractType: 'TokenExample',
      destinationAddress,
      handler: async (token, destinationAddress, destinationChainId) => {
        return await token.teleportAtomic(
          destinationAddress,
          amount,
          destinationChainId
        );
      }
    });
  }
});
