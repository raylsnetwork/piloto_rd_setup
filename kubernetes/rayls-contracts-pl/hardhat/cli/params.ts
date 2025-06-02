import { Type, number, option, optional, string } from 'cmd-ts';

export const envOption = option({
  type: string,
  long: 'env',
  description: 'Environment to use (local, dev, ...)',
  short: 'e',
  env: 'CLI_ENV'
});

export const plOption = <
  Decoder extends Type<string, unknown>,
  T = Parameters<typeof option<Decoder>>[0]
>(
  config?: T
) => {
  return option({
    type: string,
    long: 'pl',
    description: 'The Pl identification (ex: A, B, C, D, BACEN, TREASURY)',
    ...(config || {})
  });
};

export const plsOption = <
  Decoder extends Type<string, unknown>,
  T = Parameters<typeof option<Decoder>>[0]
>(
  config?: T
) => {
  return option({
    type: optional(string),
    long: 'pls',
    description:
      'The Pls identification, all configured Pls included by default (ex: A, B, C, D, BACEN, TREASURY)',
    ...(config || {})
  });
};

export const tokenOption = option({
  type: string,
  long: 'token',
  description: 'The token name',
  short: 't'
});

export const chainIdOption = option({
  type: number,
  long: 'chain-id',
  description: `The participant's chainId`
});

export const resourceIdOption = option({
  type: string,
  long: 'resource-id',
  description: 'The resource id'
});

export const resourceIdsOption = option({
  type: string,
  long: 'resource-ids',
  description: 'The resource ids'
});

export const optionalResourceIdsOption = option({
  type: optional(string),
  long: 'resource-ids',
  description: 'The resource ids to use (All tokens by default)'
});
