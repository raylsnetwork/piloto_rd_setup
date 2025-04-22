// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct RaylsMessage {
    RaylsMessageMetadata messageMetadata;
    bytes payload;
}

struct RaylsMessageMetadata {
    // Bool flag to empty check
    bool valid;
    // Message Nonce, to ensure order of messages
    uint256 nonce;
    // Optional metadata to set a new resource on the destination PL
    NewResourceMetadata newResourceMetadata;
    // Identifier of a resource, a way to call a smart contract identified by id instead of address
    bytes32 resourceId;
    // Data to be locked until transaction got confirmed
    bytes lockData;
    // Revert data to be executed on the sender chain if the transaction fails
    bytes revertPayloadDataSender;
    bytes revertPayloadDataReceiver;
    // Metadata from a erc20 transaction
    BridgedTransferMetadata transferMetadata;
    // Flag to disable nonce validation. Should only be used by the local relayer, should reject cross chain messages when this flag is true
    bool ignoresNonce;
}

struct NewResourceMetadata {
    // Bool flag to empty check
    bool valid;
    ResourceDeployType resourceDeployType;
    bytes bytecode;                         // When ResourceDeployType == BYTECODE
    RaylsBridgeableERC factoryTemplate;     // When ResourceDeployType == FACTORY
    bytes initializerParams;                // When ResourceDeployType == FACTORY
}

struct BridgedTransferMetadata {
    RaylsBridgeableERC assetType;
    uint256 id;                      // Disregard if assetType == 0 == ERC20
    address from;
    address to;
    address tokenAddress;
    uint256 amount;
}

enum ResourceDeployType {
    BYTECODE,
    FACTORY
}

enum RaylsBridgeableERC {
    ERC20,
    ERC721,
    ERC1155
}
