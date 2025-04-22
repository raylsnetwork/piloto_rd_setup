import {
  ResourceRegistryV1,
  TokenRegistryV1
} from '../../../../typechain-types';
import { TokenContractTypes } from '../../../utils/cfg/types/_contracts';

export enum TokenStatus {
  NEW,
  ACTIVE,
  INACTIVE
}

export function mapTokenRegistryData(
  token: TokenRegistryV1.TokenStructOutput,
  resource?: ResourceRegistryV1.ResourceStructOutput
) {
  const {
    resourceId,
    name,
    symbol,
    issuerChainId,
    issuerImplementationAddress,
    isFungible,
    status,
    createdAt,
    updatedAt
  } = token;

  const data = {
    resourceId,
    name,
    symbol,
    standard:
      resource?.standard !== undefined
        ? ErcStandard[parseInt(resource.standard.toString())]
        : undefined,
    issuerChainId,
    issuerImplementationAddress,
    isFungible,
    status: TokenStatus[parseInt(status.toString())],
    createdAt: new Date(parseInt(createdAt.toString()) * 1000).toISOString(),
    updatedAt: new Date(parseInt(updatedAt.toString()) * 1000).toISOString()
  };

  Object.keys(data).forEach(
    (key) =>
      data[key as keyof typeof data] === undefined &&
      delete data[key as keyof typeof data]
  );

  return data;
}

export enum ErcStandard {
  ERC20,
  ERC404,
  ERC721,
  ERC1155,
  Enygma,
  Custom
}

export function ercStandardToContractType(
  ercStandard: bigint
): TokenContractTypes {
  const standard = parseInt(ercStandard.toString());

  switch (standard) {
    case ErcStandard.ERC20:
      return 'TokenExample';
    case ErcStandard.ERC721:
      return 'RaylsErc721Example';
    case ErcStandard.ERC1155:
      return 'RaylsErc1155Example';
    case ErcStandard.Enygma:
      return 'TokenExample';

    default:
      throw new Error(`Erc standard not supported ${standard}`);
  }
}
