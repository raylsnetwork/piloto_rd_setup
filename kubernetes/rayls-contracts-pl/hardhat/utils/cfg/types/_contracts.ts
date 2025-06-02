//@ts-nocheck
import * as TypeChainTypes from '../../../../typechain-types';

export type TokenContractTypes = keyof TokenContracts;

export type TokenContracts = {
  AccessControlUpgradeable: {
    contract: TypeChainTypes.AccessControlUpgradeable,
    factory: TypeChainTypes.AccessControlUpgradeable__factory
},
  OwnableUpgradeable: {
    contract: TypeChainTypes.OwnableUpgradeable,
    factory: TypeChainTypes.OwnableUpgradeable__factory
},
  AccessControl: {
    contract: TypeChainTypes.AccessControl,
    factory: TypeChainTypes.AccessControl__factory
},
  IAccessControl: {
    contract: TypeChainTypes.IAccessControl,
    factory: TypeChainTypes.IAccessControl__factory
},
  Ownable: {
    contract: TypeChainTypes.Ownable,
    factory: TypeChainTypes.Ownable__factory
},
  IERC1967: {
    contract: TypeChainTypes.IERC1967,
    factory: TypeChainTypes.IERC1967__factory
},
  IERC5267: {
    contract: TypeChainTypes.IERC5267,
    factory: TypeChainTypes.IERC5267__factory
},
  ERC1967Proxy: {
    contract: TypeChainTypes.ERC1967Proxy,
    factory: TypeChainTypes.ERC1967Proxy__factory
},
  ERC1967Utils: {
    contract: TypeChainTypes.ERC1967Utils,
    factory: TypeChainTypes.ERC1967Utils__factory
},
  Proxy: {
    contract: TypeChainTypes.Proxy,
    factory: TypeChainTypes.Proxy__factory
},
  IBeacon: {
    contract: TypeChainTypes.IBeacon,
    factory: TypeChainTypes.IBeacon__factory
},
  ERC1155: {
    contract: TypeChainTypes.ERC1155,
    factory: TypeChainTypes.ERC1155__factory
},
  IERC1155: {
    contract: TypeChainTypes.IERC1155,
    factory: TypeChainTypes.IERC1155__factory
},
  IERC1155Receiver: {
    contract: TypeChainTypes.IERC1155Receiver,
    factory: TypeChainTypes.IERC1155Receiver__factory
},
  IERC1155MetadataURI: {
    contract: TypeChainTypes.IERC1155MetadataURI,
    factory: TypeChainTypes.IERC1155MetadataURI__factory
},
  ERC20: {
    contract: TypeChainTypes.ERC20,
    factory: TypeChainTypes.ERC20__factory
},
  IERC20: {
    contract: TypeChainTypes.IERC20,
    factory: TypeChainTypes.IERC20__factory
},
  ERC20Permit: {
    contract: TypeChainTypes.ERC20Permit,
    factory: TypeChainTypes.ERC20Permit__factory
},
  IERC20Metadata: {
    contract: TypeChainTypes.IERC20Metadata,
    factory: TypeChainTypes.IERC20Metadata__factory
},
  IERC20Permit: {
    contract: TypeChainTypes.IERC20Permit,
    factory: TypeChainTypes.IERC20Permit__factory
},
  ERC721: {
    contract: TypeChainTypes.ERC721,
    factory: TypeChainTypes.ERC721__factory
},
  IERC721: {
    contract: TypeChainTypes.IERC721,
    factory: TypeChainTypes.IERC721__factory
},
  IERC721Receiver: {
    contract: TypeChainTypes.IERC721Receiver,
    factory: TypeChainTypes.IERC721Receiver__factory
},
  IERC721Metadata: {
    contract: TypeChainTypes.IERC721Metadata,
    factory: TypeChainTypes.IERC721Metadata__factory
},
  IMessageDispatcher: {
    contract: TypeChainTypes.IMessageDispatcher,
    factory: TypeChainTypes.IMessageDispatcher__factory
},
  MessageExecutor: {
    contract: TypeChainTypes.MessageExecutor,
    factory: TypeChainTypes.MessageExecutor__factory
},
  SignatureStorage: {
    contract: TypeChainTypes.SignatureStorage,
    factory: TypeChainTypes.SignatureStorage__factory
},
  TokenLocker: {
    contract: TypeChainTypes.TokenLocker,
    factory: TypeChainTypes.TokenLocker__factory
},
  DeploymentProxyRegistry: {
    contract: TypeChainTypes.DeploymentProxyRegistry,
    factory: TypeChainTypes.DeploymentProxyRegistry__factory
},
  BroadcastManager: {
    contract: TypeChainTypes.BroadcastManager,
    factory: TypeChainTypes.BroadcastManager__factory
},
  EnygmaManager: {
    contract: TypeChainTypes.EnygmaManager,
    factory: TypeChainTypes.EnygmaManager__factory
},
  ParticipantManager: {
    contract: TypeChainTypes.ParticipantManager,
    factory: TypeChainTypes.ParticipantManager__factory
},
  ParticipantManagerV2: {
    contract: TypeChainTypes.ParticipantManagerV2,
    factory: TypeChainTypes.ParticipantManagerV2__factory
},
  ParticipantStorage: {
    contract: TypeChainTypes.ParticipantStorage,
    factory: TypeChainTypes.ParticipantStorage__factory
},
  ParticipantStorageV2: {
    contract: TypeChainTypes.ParticipantStorageV2,
    factory: TypeChainTypes.ParticipantStorageV2__factory
},
  StorageBase: {
    contract: TypeChainTypes.StorageBase,
    factory: TypeChainTypes.StorageBase__factory
},
  ParticipantStorageV1: {
    contract: TypeChainTypes.ParticipantStorageV1,
    factory: TypeChainTypes.ParticipantStorageV1__factory
},
  Proofs: {
    contract: TypeChainTypes.Proofs,
    factory: TypeChainTypes.Proofs__factory
},
  ResourceRegistryV1: {
    contract: TypeChainTypes.ResourceRegistryV1,
    factory: TypeChainTypes.ResourceRegistryV1__factory
},
  TeleportV1: {
    contract: TypeChainTypes.TeleportV1,
    factory: TypeChainTypes.TeleportV1__factory
},
  TokenRegistryV1: {
    contract: TypeChainTypes.TokenRegistryV1,
    factory: TypeChainTypes.TokenRegistryV1__factory
},
  RaylsDvpSettlement: {
    contract: TypeChainTypes.RaylsDvpSettlement,
    factory: TypeChainTypes.RaylsDvpSettlement__factory
},
  Signatures: {
    contract: TypeChainTypes.Signatures,
    factory: TypeChainTypes.Signatures__factory
},
  DeploymentRegistry: {
    contract: TypeChainTypes.DeploymentRegistry,
    factory: TypeChainTypes.DeploymentRegistry__factory
},
  RaylsApp: {
    contract: TypeChainTypes.RaylsApp,
    factory: TypeChainTypes.RaylsApp__factory
},
  RaylsAppV1: {
    contract: TypeChainTypes.RaylsAppV1,
    factory: TypeChainTypes.RaylsAppV1__factory
},
  IRaylsEndpoint: {
    contract: TypeChainTypes.IRaylsEndpoint,
    factory: TypeChainTypes.IRaylsEndpoint__factory
},
  IRaylsMessageExecutor: {
    contract: TypeChainTypes.IRaylsMessageExecutor,
    factory: TypeChainTypes.IRaylsMessageExecutor__factory
},
  MessageLib: {
    contract: TypeChainTypes.MessageLib,
    factory: TypeChainTypes.MessageLib__factory
},
  Curve: {
    contract: TypeChainTypes.Curve,
    factory: TypeChainTypes.Curve__factory
},
  EllipticCurve: {
    contract: TypeChainTypes.EllipticCurve,
    factory: TypeChainTypes.EllipticCurve__factory
},
  SharedObjects: {
    contract: TypeChainTypes.SharedObjects,
    factory: TypeChainTypes.SharedObjects__factory
},
  Utils: {
    contract: TypeChainTypes.Utils,
    factory: TypeChainTypes.Utils__factory
},
  RaylsEnygmaHandler: {
    contract: TypeChainTypes.RaylsEnygmaHandler,
    factory: TypeChainTypes.RaylsEnygmaHandler__factory
},
  RaylsErc1155Handler: {
    contract: TypeChainTypes.RaylsErc1155Handler,
    factory: TypeChainTypes.RaylsErc1155Handler__factory
},
  RaylsErc20Handler: {
    contract: TypeChainTypes.RaylsErc20Handler,
    factory: TypeChainTypes.RaylsErc20Handler__factory
},
  RaylsErc721Handler: {
    contract: TypeChainTypes.RaylsErc721Handler,
    factory: TypeChainTypes.RaylsErc721Handler__factory
},
  Constants: {
    contract: TypeChainTypes.Constants,
    factory: TypeChainTypes.Constants__factory
},
  EndpointV1: {
    contract: TypeChainTypes.EndpointV1,
    factory: TypeChainTypes.EndpointV1__factory
},
  CurveBabyJubJub: {
    contract: TypeChainTypes.CurveBabyJubJub,
    factory: TypeChainTypes.CurveBabyJubJub__factory
},
  EnygmaCCEvents: {
    contract: TypeChainTypes.EnygmaCCEvents,
    factory: TypeChainTypes.EnygmaCCEvents__factory
},
  EnygmaFactory: {
    contract: TypeChainTypes.EnygmaFactory,
    factory: TypeChainTypes.EnygmaFactory__factory
},
  EnygmaPLEvents: {
    contract: TypeChainTypes.EnygmaPLEvents,
    factory: TypeChainTypes.EnygmaPLEvents__factory
},
  EnygmaV1: {
    contract: TypeChainTypes.EnygmaV1,
    factory: TypeChainTypes.EnygmaV1__factory
},
  EnygmaVerifierk2: {
    contract: TypeChainTypes.EnygmaVerifierk2,
    factory: TypeChainTypes.EnygmaVerifierk2__factory
},
  EnygmaVerifierk2Proxy: {
    contract: TypeChainTypes.EnygmaVerifierk2Proxy,
    factory: TypeChainTypes.EnygmaVerifierk2Proxy__factory
},
  EnygmaVerifierk6: {
    contract: TypeChainTypes.EnygmaVerifierk6,
    factory: TypeChainTypes.EnygmaVerifierk6__factory
},
  EnygmaVerifierk6Proxy: {
    contract: TypeChainTypes.EnygmaVerifierk6Proxy,
    factory: TypeChainTypes.EnygmaVerifierk6Proxy__factory
},
  ParticipantStorageReplicaV1: {
    contract: TypeChainTypes.ParticipantStorageReplicaV1,
    factory: TypeChainTypes.ParticipantStorageReplicaV1__factory
},
  ParticipantStorageReplicaV2: {
    contract: TypeChainTypes.ParticipantStorageReplicaV2,
    factory: TypeChainTypes.ParticipantStorageReplicaV2__factory
},
  RaylsContractFactoryV1: {
    contract: TypeChainTypes.RaylsContractFactoryV1,
    factory: TypeChainTypes.RaylsContractFactoryV1__factory
},
  RaylsMessageExecutorV1: {
    contract: TypeChainTypes.RaylsMessageExecutorV1,
    factory: TypeChainTypes.RaylsMessageExecutorV1__factory
},
  TokenRegistryReplicaV1: {
    contract: TypeChainTypes.TokenRegistryReplicaV1,
    factory: TypeChainTypes.TokenRegistryReplicaV1__factory
},
  IEnygma: {
    contract: TypeChainTypes.IEnygma,
    factory: TypeChainTypes.IEnygma__factory
},
  IEnygmaCCEvents: {
    contract: TypeChainTypes.IEnygmaCCEvents,
    factory: TypeChainTypes.IEnygmaCCEvents__factory
},
  IEnygmaPLEvents: {
    contract: TypeChainTypes.IEnygmaPLEvents,
    factory: TypeChainTypes.IEnygmaPLEvents__factory
},
  IEnygmaV1: {
    contract: TypeChainTypes.IEnygmaV1,
    factory: TypeChainTypes.IEnygmaV1__factory
},
  IEnygmaVerifierk2: {
    contract: TypeChainTypes.IEnygmaVerifierk2,
    factory: TypeChainTypes.IEnygmaVerifierk2__factory
},
  IEnygmaVerifierk6: {
    contract: TypeChainTypes.IEnygmaVerifierk6,
    factory: TypeChainTypes.IEnygmaVerifierk6__factory
},
  IParticipantStorage: {
    contract: TypeChainTypes.IParticipantStorage,
    factory: TypeChainTypes.IParticipantStorage__factory
},
  IParticipantValidator: {
    contract: TypeChainTypes.IParticipantValidator,
    factory: TypeChainTypes.IParticipantValidator__factory
},
  ITokenRegistryValidator: {
    contract: TypeChainTypes.ITokenRegistryValidator,
    factory: TypeChainTypes.ITokenRegistryValidator__factory
},
  ArbitraryMessage: {
    contract: TypeChainTypes.ArbitraryMessage,
    factory: TypeChainTypes.ArbitraryMessage__factory
},
  ArbitraryMessagesBatchTeleport: {
    contract: TypeChainTypes.ArbitraryMessagesBatchTeleport,
    factory: TypeChainTypes.ArbitraryMessagesBatchTeleport__factory
},
  BatchTransfer: {
    contract: TypeChainTypes.BatchTransfer,
    factory: TypeChainTypes.BatchTransfer__factory
},
  CustomTokenExample: {
    contract: TypeChainTypes.CustomTokenExample,
    factory: TypeChainTypes.CustomTokenExample__factory
},
  EndpointV2Example: {
    contract: TypeChainTypes.EndpointV2Example,
    factory: TypeChainTypes.EndpointV2Example__factory
},
  EnygmaTokenExample: {
    contract: TypeChainTypes.EnygmaTokenExample,
    factory: TypeChainTypes.EnygmaTokenExample__factory
},
  RaylsErc1155Example: {
    contract: TypeChainTypes.RaylsErc1155Example,
    factory: TypeChainTypes.RaylsErc1155Example__factory
},
  Erc20BatchTeleport: {
    contract: TypeChainTypes.Erc20BatchTeleport,
    factory: TypeChainTypes.Erc20BatchTeleport__factory
},
  RaylsErc721Example: {
    contract: TypeChainTypes.RaylsErc721Example,
    factory: TypeChainTypes.RaylsErc721Example__factory
},
  PlaygroundErc1155: {
    contract: TypeChainTypes.PlaygroundErc1155,
    factory: TypeChainTypes.PlaygroundErc1155__factory
},
  PlaygroundErc20: {
    contract: TypeChainTypes.PlaygroundErc20,
    factory: TypeChainTypes.PlaygroundErc20__factory
},
  PlaygroundErc721: {
    contract: TypeChainTypes.PlaygroundErc721,
    factory: TypeChainTypes.PlaygroundErc721__factory
},
  SimpleErc20: {
    contract: TypeChainTypes.SimpleErc20,
    factory: TypeChainTypes.SimpleErc20__factory
},
  TeleportV2Example: {
    contract: TypeChainTypes.TeleportV2Example,
    factory: TypeChainTypes.TeleportV2Example__factory
},
  TokenExample: {
    contract: TypeChainTypes.TokenExample,
    factory: TypeChainTypes.TokenExample__factory
},
  RLPEncode: {
    contract: TypeChainTypes.RLPEncode,
    factory: TypeChainTypes.RLPEncode__factory
},
  RaylsERC1967Proxy: {
    contract: TypeChainTypes.RaylsERC1967Proxy,
    factory: TypeChainTypes.RaylsERC1967Proxy__factory
},
  RaylsReentrancyGuardV1: {
    contract: TypeChainTypes.RaylsReentrancyGuardV1,
    factory: TypeChainTypes.RaylsReentrancyGuardV1__factory
}
}
  
export const TokenTypes = [
  "AccessControlUpgradeable",
  "OwnableUpgradeable",
  "AccessControl",
  "IAccessControl",
  "Ownable",
  "IERC1967",
  "IERC5267",
  "ERC1967Proxy",
  "ERC1967Utils",
  "Proxy",
  "IBeacon",
  "ERC1155",
  "IERC1155",
  "IERC1155Receiver",
  "IERC1155MetadataURI",
  "ERC20",
  "IERC20",
  "ERC20Permit",
  "IERC20Metadata",
  "IERC20Permit",
  "ERC721",
  "IERC721",
  "IERC721Receiver",
  "IERC721Metadata",
  "IMessageDispatcher",
  "MessageExecutor",
  "SignatureStorage",
  "TokenLocker",
  "DeploymentProxyRegistry",
  "BroadcastManager",
  "EnygmaManager",
  "ParticipantManager",
  "ParticipantManagerV2",
  "ParticipantStorage",
  "ParticipantStorageV2",
  "StorageBase",
  "ParticipantStorageV1",
  "Proofs",
  "ResourceRegistryV1",
  "TeleportV1",
  "TokenRegistryV1",
  "RaylsDvpSettlement",
  "Signatures",
  "DeploymentRegistry",
  "RaylsApp",
  "RaylsAppV1",
  "IRaylsEndpoint",
  "IRaylsMessageExecutor",
  "MessageLib",
  "Curve",
  "EllipticCurve",
  "SharedObjects",
  "Utils",
  "RaylsEnygmaHandler",
  "RaylsErc1155Handler",
  "RaylsErc20Handler",
  "RaylsErc721Handler",
  "Constants",
  "EndpointV1",
  "CurveBabyJubJub",
  "EnygmaCCEvents",
  "EnygmaFactory",
  "EnygmaPLEvents",
  "EnygmaV1",
  "EnygmaVerifierk2",
  "EnygmaVerifierk2Proxy",
  "EnygmaVerifierk6",
  "EnygmaVerifierk6Proxy",
  "ParticipantStorageReplicaV1",
  "ParticipantStorageReplicaV2",
  "RaylsContractFactoryV1",
  "RaylsMessageExecutorV1",
  "TokenRegistryReplicaV1",
  "IEnygma",
  "IEnygmaCCEvents",
  "IEnygmaPLEvents",
  "IEnygmaV1",
  "IEnygmaVerifierk2",
  "IEnygmaVerifierk6",
  "IParticipantStorage",
  "IParticipantValidator",
  "ITokenRegistryValidator",
  "ArbitraryMessage",
  "ArbitraryMessagesBatchTeleport",
  "BatchTransfer",
  "CustomTokenExample",
  "EndpointV2Example",
  "EnygmaTokenExample",
  "RaylsErc1155Example",
  "Erc20BatchTeleport",
  "RaylsErc721Example",
  "PlaygroundErc1155",
  "PlaygroundErc20",
  "PlaygroundErc721",
  "SimpleErc20",
  "TeleportV2Example",
  "TokenExample",
  "RLPEncode",
  "RaylsERC1967Proxy",
  "RaylsReentrancyGuardV1"
] as const;
  
export type ContractResolver<T> = T extends TokenContractTypes
  ? TokenContracts[T]['contract']
  : never;

export type ContractFactoryResolver<T> = T extends TokenContractTypes
  ? TokenContracts[T]['factory']
  : never;
