import { Type, flag, number, option, optional, string } from 'cmd-ts';
import { Default } from 'cmd-ts/dist/cjs/default';

export const tokenNameOption = (config: Default<string>) =>
  option({
    type: string,
    long: 'token',
    description: 'The token name',
    defaultValueIsSerializable: true,
    ...config
  });

export const TokenNameOption = option({
  type: string,
  long: 'token',
  description: 'The token name'
});

export const SymbolOption = option({
  type: string,
  long: 'symbol',
  description: 'The token symbol'
});

export const SubmitOption = flag({
  type: {
    from: async (x) => x,
    defaultValue: () => true,
    defaultValueIsSerializable: true
  } satisfies Type<boolean, boolean>,
  long: 'submit',
  description: 'Submit Token to Ven'
});

export const AddressesOption = option({
  type: optional(string),
  long: 'addresses',
  description:
    'The addresses to check, by default all configured Wallets are included (ex: 0x123,0x456)'
});

export const ErcIdOption = option({
  type: number,
  long: 'erc-id',
  description: 'The Erc Id for ERC721 & ERC1155 standards'
});

export const AmountOption = option({
  type: {
    from: async (x) => BigInt(x)
  } satisfies Type<string, bigint>,
  long: 'amount',
  description: 'The amount'
});

export const FromWalletOption = option({
  type: optional(string),
  long: 'from-wallet',
  description: 'The private key of the wallet to use for the transaction'
});

export const destinationAddressOption = <
  Decoder extends Type<string, unknown>,
  T = Parameters<typeof option<Decoder>>[0]
>(
  config?: T
) =>
  option({
    type: optional(string),
    long: 'destination-address',
    description: `The destination address to send the tokens (if null, plDest wallet address in the config will be used)`,
    ...(config || {})
  });

export const AccountOption = option({
  type: optional(string),
  long: 'private-key',
  description: 'The private key to use for the transaction',
  env: 'PRIVATE_KEY_SYSTEM'
});
