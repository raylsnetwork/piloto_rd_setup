// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import '../RaylsMessage.sol';
import '../libraries/MessageLib.sol';

interface IRaylsEndpoint {
    /**
     * @notice Retrieves the address of the contract that implements the resource.
     *
     * @param _resourceId The identification of the resource.
     */
    function getAddressByResourceId(bytes32 _resourceId) external view returns (address);

    /**
     * @notice Sends a Rayls message to the specified address at a Rayls endpoint.
     *         Use this method for single message transactions. Ensure the payload format
     *         and gas limits meet the requirements of the destination chain and contract.
     * @param _dstChainId The destination chain identifier.
     * @param _destination The address on the destination chain.
     * @param _payload The verified payload to send to the destination contract.
     */
    function send(uint256 _dstChainId, address _destination, bytes calldata _payload) external payable returns (bytes32 messageId);

    /**
     * @notice Sends a Rayls message to the specified address at a Rayls endpoint.
     *         Use this method for multiple message transactions. Ensure the payload format
     *         and gas limits meet the requirements of the destination chain and contract.
     * @param _destinationPayloadRequests The payloads to send to the destination contract.
     */
    function sendBatch(DestinationPayloadRequest[] calldata _destinationPayloadRequests) external returns (bytes32 batchId);

    /**
     * @notice Sends a Rayls message to the specified resource at a Rayls endpoint.
     *         A resourceId is an identification of a resource across multiple chains. So
     *         instead of calling the destination address, you can call by the resourceId.
     *         Use this method for single message transactions. Ensure the payload format
     *         and gas limits meet the requirements of the destination chain and contract.
     * @param _dstChainId The destination chain identifier.
     * @param _resourceId The id of the resource on the destination chain.
     * @param _payload The verified payload to send to the destination contract.
     */
    function sendToResourceId(uint256 _dstChainId, bytes32 _resourceId, bytes calldata _payload) external payable returns (bytes32 messageId);

    /**
     * @notice Sends Rayls messages to the specified resource at a Rayls endpoint.
     *         A resourceId is an identification of a resource across multiple chains. So
     *         instead of calling the destination address, you can call by the resourceId.
     *         Use this method for multiple message transactions. Ensure the payload format
     *         and gas limits meet the requirements of the destination chain and contract.
     * @param _resourceIdPayloadRequests The verified payloads to send to the destination contract.
     */
    function sendBatchToResourceId(ResourceIdPayloadRequest[] calldata _resourceIdPayloadRequests) external payable returns (bytes32 batchId);

    /**
     * @notice Sends a Rayls message to the specified resource at a Rayls endpoint.
     *         A resourceId is an identification of a resource across multiple chains. So
     *         instead of calling the destination address, you can call by the resourceId.
     *         Use this method for single message transactions. Ensure the payload format
     *         and gas limits meet the requirements of the destination chain and contract.
     * @param _dstChainId The destination chain identifier.
     * @param _resourceId The id of the resource on the destination chain.
     * @param _payload The verified payload to send to the destination contract.
     * @param _lockData The lockData
     * @param _revertDataPayloadSender The revertData for the sender chainId
     * @param _revertDataPayloadReceiver The revertData for the receiver chainId
     */
    function sendToResourceId(
        uint256 _dstChainId,
        bytes32 _resourceId,
        bytes calldata _payload,
        bytes memory _lockData,
        bytes memory _revertDataPayloadSender,
        bytes memory _revertDataPayloadReceiver,
        BridgedTransferMetadata memory transferMetadata
    ) external payable returns (bytes32 messageId);

    /**
     * @notice Sends Rayls messages to the specified resource at a Rayls endpoint.
     *         A resourceId is an identification of a resource across multiple chains. So
     *         instead of calling the destination address, you can call by the resourceId.
     *         Use this method for multiple message transactions. Ensure the payload format
     *         and gas limits meet the requirements of the destination chain and contract.
     * @param _resourceIdPayloadRequests The verified payloads to send to the destination contract.
     */
    function sendBatchToResourceId(ResourceIdCompletePayloadRequest[] calldata _resourceIdPayloadRequests) external payable returns (bytes32 batchId);

    /**
     * @notice Used by the messaging library to publish a verified payload to the destination contract.
     *         Typically called by other contracts or endpoints on the same chain.
     *         Ensures message integrity and ordering using the nonce and messageId.
     * @param _srcChainId The source chain identifier.
     * @param _srcAddress The source contract address (as bytes) on the source chain.
     * @param _dstAddress The address on the destination chain.
     * @param _raylsMessage A message including RaylsMessageMetadataV1 to do validations like nonce and also the metadata
     * @param _messageId The unique identifier of the message.
     */
    function receivePayload(uint256 _srcChainId, address _srcAddress, address _dstAddress, RaylsMessage memory _raylsMessage, bytes32 _messageId) external;

    /**
     * @notice Associates an address to a resourceId
     * @param _resourceId The identification of the resource
     * @param _implementationAddress The address where the resource was implemented
     */
    function registerResourceId(bytes32 _resourceId, address _implementationAddress) external;

    /**
     * @notice Retrieves the inboundNonce for a receiving address from a source chain, which could be EVM or non-EVM.
     *         The nonce is used to track the order of messages received from a specific chain/source.
     * @param _srcChainId The source chain identifier.
     * @return The current inbound nonce value.
     */
    function getInboundNonce(uint256 _srcChainId) external view returns (uint256);

    /**
     * @notice Retrieves the outboundNonce for messages sent from this chain, which is always an EVM chain.
     *         The nonce is useful for maintaining the order of sent messages and for audit purposes.
     * @param _dstChainId The destination chain identifier.
     * @return The current outbound nonce value.
     */
    function getOutboundNonce(uint256 _dstChainId) external view returns (uint256);

    /**
     * @notice Retrieves the immutable chain identifier of this Endpoint.
     *         This identifier is unique in the context of multi-chain interactions.
     * @return The chain ID of this endpoint.
     */
    function getChainId() external view returns (uint256);

    /**
     * @notice Retrieves the immutable commit chain id .
     *         This identifier is unique in the context of multi-chain interactions.
     * @return The commit chain ID.
     */
    function getCommitChainId() external view returns (uint256);

    /**
     * @notice Register a contract address from commit chain to be queried internally by the contracts
     * @param _contractName The name of the contract
     * @param _contractAddressOnCommitChain The name of the contract
     */
    function registerCommitChainAddress(string memory _contractName, address _contractAddressOnCommitChain) external;

    /**
     * @notice Gets a contract address from commit chain by it's name
     * @param _contractName The name of the contract
     */
    function getCommitChainAddress(string memory _contractName) external view returns (address);

    /**
     * @notice Check if is a trusted executor address.
     * @param _executor Address to check
     */
    function isTrustedExecutor(address _executor) external view returns (bool);

    /**
     * @notice Retrieves the protocol version.
     * @return The protocol version.
     */
    function version() external pure returns (string memory);

    /**
     * @notice Triggers the protocol DH key update.
     */
    function requestNewDHKeys(uint256 blockNumber) external;
}
