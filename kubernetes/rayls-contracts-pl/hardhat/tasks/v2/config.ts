import { scope } from 'hardhat/config';

/**
 * Commit Chain scopes
 */

export const CommitChainScope = scope(
  'cc',
  'Interactions for Commit Chain contracts',
);

export const CcParticipantStorageScope = scope(
  'cc:participant-storage',
  'Interactions with Participant Storage contract',
);

export const CcTokenRegistryScope = scope(
  'cc:token-registry',
  'Interactions with Token Registry contract',
);

/**
 * Pl scopes
 */

export const PlScope = scope('pl', 'Interactions for Pl contracts');

export const RaylsErc20Scope = scope(
  'pl:rayls-erc20',
  'Interactions with ERC20 Rayls contracts',
);

export const Rayls1155Scope = scope(
  'pl:rayls-erc1155',
  'Interactions with ERC1155 Rayls contracts',
);

export const DvpScope = scope('pl:dvp', 'Interactions with Single Ledger DVP contracts');


/**
 * Relayer scope
 */

export const RelayerScope = scope('relayer', 'Scripts related to relayer');
