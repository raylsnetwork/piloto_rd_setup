import hre from 'hardhat';
import { getEthers } from '../../utils/cfg/ethers';
import {
  AddressesOption,
  AmountOption,
  ErcIdOption,
  FromWalletOption,
  SubmitOption,
  TokenNameOption,
  destinationAddressOption,
  tokenNameOption
} from './utils/params';
import { envOption, plOption, plsOption } from '../params';
import { command, subcommands } from 'cmd-ts';
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
  description: 'Deploys a Rayls ERC20 contract',
  args: {
    env: envOption,
    plName: plOption(),
    tokenName: tokenNameOption({
      defaultValue: () => `RaylsErc1155_${Date.now()}`
    }),
    submit: SubmitOption
  },
  handler: async ({ env, plName, tokenName, submit }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await deployToken(web3, {
      contractType: 'RaylsErc1155Example',
      plName,
      submit,
      tokenName,
      handler: (_, token, endpointAddress) => {
        return token.deploy('url', tokenName, endpointAddress);
      }
    });
  }
});

export const submitCommand = command({
  name: 'submit',
  description: 'Submit a Rayls ERC1155 contract to Ven',
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

    const token = await pl.getTokenByType('RaylsErc1155Example', tokenName);

    const resourceId = await token.resourceId();

    if (resourceId && (await web3.isAddressValid(resourceId))) {
      throw new Error('Token already submitted');
    }

    const tx = await token.submitTokenRegistration(0);

    await tx.wait();

    spinner.succeed();

    Logger.info(`Token Registration Submitted`);
  }
});

export const mintCommand = command({
  name: 'mint',
  description: 'Mints tokens to an address',
  args: {
    env: envOption,
    tokenName: TokenNameOption,
    ercId: ErcIdOption,
    amount: AmountOption,
    address: destinationAddressOption()
  },
  handler: async ({ env, tokenName, ercId, address, amount }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await mintOrBurn(web3, {
      tokenName,
      contractType: 'RaylsErc1155Example',
      operation: 'MINT',
      address,
      amount,
      ercId,
      handler: async (_, token, dstAddress) =>
        token.mint(dstAddress, ercId, amount, Buffer.from('CLI_MINT'))
    });
  }
});

export const burnCommand = command({
  name: 'burn',
  description: 'Burns tokens from an address',
  args: {
    env: envOption,
    tokenName: TokenNameOption,
    address: destinationAddressOption(),
    ercId: ErcIdOption,
    amount: AmountOption
  },
  handler: async ({ env, tokenName, ercId, address, amount }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await mintOrBurn(web3, {
      tokenName,
      contractType: 'RaylsErc1155Example',
      operation: 'BURN',
      address,
      amount: '1',
      ercId,
      handler: async (_, token, destAddress) =>
        token.burn(destAddress, ercId, amount)
    });
  }
});

export const metadataCommand = command({
  name: 'metadata',
  description:
    'Get the metadata of a Rayls ERC1155 contract (name, resourceId)',
  args: {
    env: envOption,
    plName: plOption(),
    tokenName: TokenNameOption
  },
  handler: async ({ env, plName, tokenName }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await getMetadata(web3, {
      plName,
      contractType: 'RaylsErc1155Example',
      tokenName,
      handler: async (_, token) => {
        const [name, resourceId] = await Promise.all([
          token.name(),
          token.resourceId()
        ]);

        return { name, resourceId };
      }
    });
  }
});

export const balanceCommand = command({
  name: 'balance',
  description:
    'Check the balance of an ERC1155 token on a specific address and ID',
  args: {
    env: envOption,
    plName: plOption(),
    tokenName: TokenNameOption,
    tokenId: ErcIdOption,
    addresses: AddressesOption
  },
  handler: async (params) => {
    const { env, plName, tokenName, tokenId } = params;
    const web3 = await getEthers({ env, ethers: hre.ethers });

    const addresses = params.addresses?.split?.(',');

    const balance = await getBalances(web3, {
      plName,
      tokenName,
      contractType: 'RaylsErc1155Example',
      addresses,
      handler: async (_, token, address) => {
        const balance = await token.balanceOf(address, tokenId);

        return balance;
      }
    });

    return balance;
  }
});

export const balancesCommand = command({
  name: 'balances',
  description: 'Check the balance of an Erc1155 token by Id on multiple PLs',
  args: {
    env: envOption,
    pls: plsOption(),
    tokenName: TokenNameOption,
    tokenId: ErcIdOption,
    addressesToCheck: AddressesOption
  },
  handler: async ({ env, pls, tokenName, tokenId, addressesToCheck }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    const plsArr = pls?.split?.(',') || web3.Pls.getPlNames();

    const addresses = addressesToCheck?.split?.(',');

    await logMultipleBalances(web3, {
      pls: plsArr,
      addresses,
      tokenName,
      contractType: 'RaylsErc1155Example',
      handler: async (_, token, address) => {
        const balance = await token.balanceOf(address, tokenId);

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
    ercId: ErcIdOption,
    from: FromWalletOption,
    to: destinationAddressOption()
  },
  handler: async ({ env, plName, tokenName, ercId, amount, to, from }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await transfer(web3, {
      plName,
      tokenName,
      amount,
      ercId,
      fromPrivateKey: from,
      destinationAddress: to,
      contractType: 'RaylsErc1155Example',
      handler: async (pl, token, destinationAddress) =>
        token.safeTransferFrom(
          from || pl.signers[0],
          destinationAddress,
          ercId,
          amount,
          Buffer.from('CLI_TRANSFER')
        )
    });
  }
});

export const teleportAtomicCommand = command({
  name: 'teleport-atomic',
  description: 'Teleport an Erc1155 token by Id from one PL to another',
  args: {
    env: envOption,
    plOrigin: plOption({ long: 'pl-origin' }),
    plDest: plOption({ long: 'pl-dest' }),
    tokenName: TokenNameOption,
    tokenId: ErcIdOption,
    amount: AmountOption,
    destinationAddress: destinationAddressOption()
  },
  handler: async ({
    env,
    plOrigin,
    plDest,
    tokenName,
    tokenId,
    amount,
    destinationAddress
  }) => {
    const web3 = await getEthers({ env, ethers: hre.ethers });

    await teleportAtomic(web3, {
      plOrigin,
      plDest,
      tokenName,
      contractType: 'RaylsErc1155Example',
      destinationAddress,
      handler: async (token, destinationAddress, destinationChainId) => {
        return await token.teleportAtomic(
          destinationAddress,
          tokenId,
          amount,
          destinationChainId,
          Buffer.from(tokenId.toString())
        );
      }
    });
  }
});
