// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.20;

import { IRaylsMessageExecutor } from "../interfaces/IRaylsMessageExecutor.sol";
import "../RaylsMessage.sol";

/**
 * @title MessageLib
 * @notice Library to declare and manipulate Message(s).
 */
library MessageLib {
    /* ============ Structs ============ */

    /**
     * @notice Message data structure
     * @param to Address that will be dispatched on the receiving chain
     * @param data Data that will be sent to the `to` address
     */
    struct Message {
        address to;
        bytes data;
    }

    /* ============ Events ============ */

    /* ============ Custom Errors ============ */

    /**
     * @notice Emitted when a messageId has already been executed.
     * @param messageId ID uniquely identifying the message or message batch that were re-executed
     */
    error MessageIdAlreadyExecuted(bytes32 messageId);

    /**
     * @notice Emitted if a call to a contract fails.
     * @param messageId ID uniquely identifying the message
     * @param errorData Error data returned by the call
     */
    error MessageFailure(bytes32 messageId, bytes errorData);

    /**
     * @notice Emitted if a call to a contract fails inside a batch of messages.
     * @param messageId ID uniquely identifying the batch of messages
     * @param messageIndex Index of the message
     * @param errorData Error data returned by the call
     */
    error MessageBatchFailure(bytes32 messageId, uint256 messageIndex, bytes errorData);

    /* ============ Internal Functions ============ */

    /**
     * @notice Helper to compute messageId.
     * @param from Address that dispatched the message
     * @param to Address that will receive the message
     * @param data Data that was dispatched
     * @return bytes32 ID uniquely identifying the message that was dispatched
     */
    function computeMessageId(uint256 fromChainId, address from, uint256 toChainId, address to, bytes memory data)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(fromChainId, from, toChainId, to, data));
    }

    /**
     * @notice Helper to compute messageId for a batch of messages.
     * @param from Address that dispatched the messages
     * @param messages Array of Message dispatched
     * @return bytes32 ID uniquely identifying the message that was dispatched
     */
    function computeMessageBatchId(
        uint256 fromChainId,
        address from,
        SendRequest[] memory messages
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(fromChainId, from, messages));
    }

    /**
     * @notice Helper to encode message for execution by the MessageExecutor.
     * @param to Address that will receive the message
     * @param data Data that will be dispatched
     * @param messageId ID uniquely identifying the message being dispatched
     * @param fromChainId ID of the chain that dispatched the message
     * @param from Address that dispatched the message
     */
    function encodeMessage(address to, bytes memory data, bytes32 messageId, uint256 fromChainId, address from)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodeCall(IRaylsMessageExecutor.executeMessage, (to, data, messageId, fromChainId, from));
    }

    /**
     * @notice Helper to encode a batch of messages for execution by the MessageExecutor.
     * @param messages Array of Message that will be dispatched
     * @param messageId ID uniquely identifying the batch of messages being dispatched
     * @param fromChainId ID of the chain that dispatched the batch of messages
     * @param from Address that dispatched the batch of messages
     */
    function encodeMessageBatch(Message[] memory messages, bytes32 messageId, uint256 fromChainId, address from)
        internal
        pure
        returns (bytes memory)
    {
        return abi.encodeCall(IRaylsMessageExecutor.executeMessageBatch, (messages, messageId, fromChainId, from));
    }

    /**
     * @notice Execute message from the origin chain.
     * @dev Will revert if `message` has already been executed.
     * @param to Address that will receive the message
     * @param data Data that was dispatched
     * @param messageId ID uniquely identifying message
     * @param fromChainId ID of the chain that dispatched the `message`
     * @param from Address of the sender on the origin chain
     * @param executedMessageId Whether `message` has already been executed or not
     */
    function executeMessage(
        address to,
        bytes memory data,
        bytes32 messageId,
        uint256 fromChainId,
        address from,
        bool executedMessageId
    ) internal {
        if (executedMessageId) {
            revert MessageIdAlreadyExecuted(messageId);
        }

        _requireContract(to);

        (bool _success, bytes memory _returnData) = to.call(abi.encodePacked(data, messageId, fromChainId, from));

        if (!_success) {
            revert MessageFailure(messageId, _returnData);
        }
    }

    /**
     * @notice Execute messages from the origin chain.
     * @dev Will revert if `messages` have already been executed.
     * @param messages Array of messages being executed
     * @param messageId Nonce to uniquely identify the messages
     * @param from Address of the sender on the origin chain
     * @param fromChainId ID of the chain that dispatched the `messages`
     * @param executedMessageId Whether `messages` have already been executed or not
     */
    function executeMessageBatch(
        Message[] memory messages,
        bytes32 messageId,
        uint256 fromChainId,
        address from,
        bool executedMessageId
    ) internal {
        if (executedMessageId) {
            revert MessageIdAlreadyExecuted(messageId);
        }

        uint256 _messagesLength = messages.length;

        for (uint256 _messageIndex; _messageIndex < _messagesLength;) {
            Message memory _message = messages[_messageIndex];
            _requireContract(_message.to);

            (bool _success, bytes memory _returnData) =
                _message.to.call(abi.encodePacked(_message.data, messageId, fromChainId, from));

            if (!_success) {
                revert MessageBatchFailure(messageId, _messageIndex, _returnData);
            }

            unchecked {
                _messageIndex++;
            }
        }
    }

    /**
     * @notice Check that the call is being made to a contract.
     * @param to Address to check
     */
    function _requireContract(address to) internal view {
        //TODO error handling
        require(to.code.length > 0, "MessageLib/no-contract-at-to");
    }

        /**
     * @notice Helper to compute messageId.
     * @param _fromChainId ChainId that dispatched the message
     * @param _from Address that dispatched the message
     * @param _toChainId ChainId that will receive the message
     * @param _to Address that will receive the message
     * @param _data Data that was dispatched
     * @return bytes32 ID uniquely identifying the message that was dispatched
     */
    function computeEnygmaReferenceId(uint256 _fromChainId, address _from, uint256[] memory _toChainId, address[] memory _to, bytes memory _data)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(_fromChainId, _from, _toChainId, _to, _data));
    }
}

struct SendRequest {
    uint256 dstChainId;
    address destination;
    bytes payload;
    bytes32 resourceId;
    NewResourceMetadata newResourceMetadata;
    bytes lockData;
    bytes revertDataSender;
    bytes revertDataReceiver;
    BridgedTransferMetadata transferMetadata;
}

struct DestinationPayloadRequest {
    uint256 _dstChainId;
    address _destination;
    bytes _payload;
}

struct ResourceIdPayloadRequest {
    uint256 _dstChainId;
    bytes32 _resourceId;
    bytes _payload;
}

struct ResourceIdCompletePayloadRequest {
    uint256 _dstChainId;
    bytes32 _resourceId;
    bytes _payload;
    bytes _lockData;
    bytes _revertDataSender;
    bytes _revertDataReceiver;
    BridgedTransferMetadata transferMetadata;
}