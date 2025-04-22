import { ResourceRegistry, TokenRegistry } from '../../../typechain-types';

export enum TokenStatus {
  NEW,
  ACTIVE,
  INACTIVE,
}

export function mapTokenRegistryData(
  token: TokenRegistry.TokenStructOutput,
  resource?: ResourceRegistry.ResourceStructOutput,
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
    updatedAt,
  } = token;

  const data = {
    resourceId,
    name,
    symbol,
    standard: resource?.standard
      ? ErcStandard[parseInt(resource.standard.toString())]
      : undefined,
    issuerChainId,
    issuerImplementationAddress,
    isFungible,
    status: TokenStatus[parseInt(status.toString())],
    createdAt: new Date(parseInt(createdAt.toString()) * 1000).toISOString(),
    updatedAt: new Date(parseInt(updatedAt.toString()) * 1000).toISOString(),
  };

  Object.keys(data).forEach(
    (key) =>
      data[key as keyof typeof data] === undefined &&
      delete data[key as keyof typeof data],
  );

  return data;
}

enum ErcStandard {
  ERC20,
  ERC404,
  ERC721,
  ERC1155,
}
