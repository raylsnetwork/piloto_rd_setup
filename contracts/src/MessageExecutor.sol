// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MessageExecutor
 * @notice Implementation of the IMessageExecutor interface for executing cross-chain messages.
 * @dev This contract handles the execution of messages and ensures each message is only executed once.
 */
contract MessageExecutor {
    address owner;
    /// @notice Mapping to track which message IDs have been executed.
    mapping(bytes32 => bool) public executed;

    /**
     * @dev Event emitted when a message is successfully executed.
     * @param fromChainId The originating chain's ID for the message.
     * @param messageId A unique identifier for the executed message.
     */
    event MessageIdExecuted(uint256 indexed fromChainId, bytes32 indexed messageId);

    /// @dev Error emitted when a message ID has already been executed.
    error MessageIdAlreadyExecuted(bytes32 messageId);

    /// @dev Error emitted when there's a failure during message execution.
    error MessageFailure(bytes32 messageId, bytes errorData);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Execute a cross-chain message.
     * @param _to The address on this chain that will process the message.
     * @param _data The call data associated with the message.
     * @param _messageId A unique identifier for the message.
     * @param _fromChainId The originating chain's ID for the message.
     * @param _from The address on the originating chain that sent the message.
     */

    function executeMessage(address _to, bytes calldata _data, bytes32 _messageId, uint256 _fromChainId, address _from)
        external
    {
        require(msg.sender == owner, "executeMessage called from unauthorized account");
        bool _executedMessageId = executed[_messageId];
        executed[_messageId] = true;

        executeMessage(_to, _data, _messageId, _fromChainId, _from, _executedMessageId);

        emit MessageIdExecuted(_fromChainId, _messageId);
    }

    /**
     * @dev Internal function to handle the logic of message execution.
     * @param to The address on this chain that will process the message.
     * @param data The call data associated with the message.
     * @param messageId A unique identifier for the message.
     * @param fromChainId The originating chain's ID for the message.
     * @param from The address on the originating chain that sent the message.
     * @param executedMessageId A flag indicating if this message ID has been executed before.
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

        require(to.code.length > 0, "No contract at target address");

        (bool _success, bytes memory _returnData) = to.call(abi.encodePacked(data, messageId, fromChainId, from));

        if (!_success) {
            revert MessageFailure(messageId, _returnData);
        }
    }
}
