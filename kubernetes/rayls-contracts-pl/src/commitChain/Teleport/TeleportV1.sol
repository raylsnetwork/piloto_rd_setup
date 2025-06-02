// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import '../../rayls-protocol-sdk/libraries/Utils.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';

/**
 * @title Teleport
 * @dev Contract for storing private ledger data and related operations.
 */
contract TeleportV1 is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    struct dataBatch {
        string batchId;
        string fingerprint;
        bytes data;
        string[] sharedIds;
    }

    mapping(uint256 => Header[]) private headers;
    mapping(string => Header) private singleHeader;

    // Mapping to store messages based on their unique message ID
    mapping(string => AtomicTeleportMessage) public atomicTeleportMessages;

    // Mapping to retrieve the string representation of a message status
    mapping(Utils.MessageStatus => string) public AtomicStatus;

    // Time duration for which a message is locked (in seconds)
    uint32 public constant LOCK_TIME = 240;

    // AtomicTeleport events
    // Event emitted when the status of a message changes
    event AtomicMessageStatusChangedBatch(string[] msgIds, Utils.MessageStatus status);
    event AtomicMessageTeleportStartedBatch(string[] msgIds, uint256 expirationTime);
    // Emits additional encrypted key-value data for a message
    event AtomicMessageAdditionalDataBatch(string[] msgIds, string encryptedData);

    // Struct representing a message, including its start time, expiration time, and status
    struct AtomicTeleportMessage {
        uint256 startTime;
        uint256 expiration;
        Utils.MessageStatus status;
    }

    // Define a struct to hold both the msgId and its corresponding status
    struct MessageStatusResult {
        string msgId;
        string status;
    }

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        AtomicStatus[Utils.MessageStatus.Pending] = 'Pending';
        AtomicStatus[Utils.MessageStatus.Executed] = 'Executed';
        AtomicStatus[Utils.MessageStatus.Rejected] = 'Rejected';
        AtomicStatus[Utils.MessageStatus.Reverted] = 'Reverted';
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Emitted when encrypted data is stored.
     * @param print The fingerprint of the data.
     * @param data The encrypted data. (array of transactions/messages)
     * @param blockNumber The commit chain block number associated with the data.
     */
    event EncryptedDataBatchStored(string print, bytes data, uint256 indexed blockNumber);

    struct Header {
        string parentHash;
        string uncleHash;
        string coinbase;
        string stateRoot;
        string transactionsRoot;
        string receiptsRoot;
        bytes logsBloom;
        uint256 difficulty;
        uint256 number;
        uint64 gasLimit;
        uint64 gasUsed;
        uint64 timestamp;
        uint8[] extra;
        string mixHash;
        bytes8 nonce;
        string _hash;
    }

    struct TokenInfo {
        string name;
        string symbol;
    }

    function storeEncryptedDataBatch(dataBatch calldata batch, uint256 blockNumber) public virtual {
        if (batch.sharedIds.length > 0) {
            storeAtomicMessageBatch(batch.sharedIds);
        }
        emit EncryptedDataBatchStored(batch.fingerprint, batch.data, blockNumber);
    }

        

    /**
     * @notice Adds a block header for a given chainId.
     * @param chainId The ID of the chain.
     * @param header The header data.
     */
    function addHeader(uint256 chainId, Header memory header) public virtual {
        headers[chainId].push(header);
    }

    /**
     * @notice Retrieves all block headers for a given chainId.
     * @param chainId The ID of the chain.
     * @return header An array of block headers associated with the chainId.
     */
    function getHeaders(uint256 chainId) public view virtual returns (Header[] memory header) {
        return headers[chainId];
    }

    /**
     * @notice Adds a single block header based on its hash.
     * @param _hash The hash of the block header.
     * @param header The block header.
     */
    function addSingleHeader(string calldata _hash, Header memory header) public virtual {
        singleHeader[_hash] = header;
    }

    /**
     * @notice Retrieves a single block header based on its hash.
     * @param _hash The hash of the block header.
     * @return header The block header.
     */
    function getSingleHeader(string calldata _hash) public view virtual returns (Header memory header) {
        return singleHeader[_hash];
    }

    /**
     * @dev Stores a new message with the given message ID.
     * @param msgIds The unique identifier for the message.
     */
    function storeAtomicMessageBatch(string[] calldata msgIds) public virtual {
        for (uint256 i = 0; i < msgIds.length; i++) {
            AtomicTeleportMessage storage message = atomicTeleportMessages[msgIds[i]];
            message.startTime = block.timestamp;
            message.expiration = message.startTime + LOCK_TIME;
            message.status = Utils.MessageStatus.Pending;
        }

        emit AtomicMessageTeleportStartedBatch(msgIds, block.timestamp + LOCK_TIME);
    }

    /**
     * @dev Executes a message with the given message ID.
     * @dev Message should have not been reverted.
     * @param msgIds The unique identifier for the message.
     * @param encryptedData_ The encrypted data associated with the message.
     */
    function executeAtomicMessageBatch(string[] calldata msgIds, string calldata encryptedData_) external virtual {
        for (uint256 i = 0; i < msgIds.length; i++) {
            AtomicTeleportMessage storage message = atomicTeleportMessages[msgIds[i]];
            // NOTICE: changed from message.status != Utils.MessageStatus.Reverted to include potential Rejected status
            if (message.status == Utils.MessageStatus.Pending) {
                message.status = Utils.MessageStatus.Executed;
            } else {
                revert(string(abi.encodePacked('Message in the batch has been reverted: ', msgIds[i])));
            }
        }

        emit AtomicMessageStatusChangedBatch(msgIds, Utils.MessageStatus.Executed);
        emit AtomicMessageAdditionalDataBatch(msgIds, encryptedData_);
    }

    function EmitAdditionalAtomicDataBatchFor(string[] calldata msgIds, string calldata encryptedData_) external virtual {
        emit AtomicMessageAdditionalDataBatch(msgIds, encryptedData_);
    }

    /**
     * @dev Reverts a message with the given message ID due to elapsed time.
     *  @dev Message should have not been executed.
     * @param msgIds The unique identifier for the message.
     * @param encryptedData_ The encrypted data associated with the message.
     */
    function revertAtomicMessageBatch(string[] calldata msgIds, string calldata encryptedData_) external virtual {
        for (uint i = 0; i < msgIds.length; i++) {
            AtomicTeleportMessage storage message = atomicTeleportMessages[msgIds[i]];
            if (message.status == Utils.MessageStatus.Pending) {
                // TODO: for optimal security & correctness, a check for block.timestamp > message.expiration should be added
                message.status = Utils.MessageStatus.Reverted;
            } else {
                revert(string(abi.encodePacked('Message has been executed', msgIds[i])));
            }
        }
        emit AtomicMessageStatusChangedBatch(msgIds, Utils.MessageStatus.Reverted);
        emit AtomicMessageAdditionalDataBatch(msgIds, encryptedData_);
    }

    /**
     * @dev Retrieves the string representation of the status for a given message ID.
     * @param msgId The unique identifier for the message.
     * @return The string representation of the message status.
     */
    function getAtomicMessage(string calldata msgId) external view virtual returns (AtomicTeleportMessage memory) {
        return atomicTeleportMessages[msgId];
    }

    /**
     * @dev Retrieves the string representation of the status for a given message ID.
     * @param msgId The unique identifier for the message.
     * @return The string representation of the message status.
     */
    function getAtomicMessageStatus(string calldata msgId) external view virtual returns (string memory) {
        Utils.MessageStatus _status = atomicTeleportMessages[msgId].status;
        return AtomicStatus[_status];
    }

    /**
     * @dev Retrieves the expiration time for a given message ID.
     * @param msgId The unique identifier for the message.
     * @return The expiration time of the message.
     */
    function getAtomicMessageExpiration(string calldata msgId) external view virtual returns (uint256) {
        return atomicTeleportMessages[msgId].expiration;
    }

    /**
     * @dev Retrieves the string representation of the status for an array of message IDs,
     *      along with the message IDs.
     * @param msgIds The array of unique identifiers for the messages.
     * @return The array of structs containing the message IDs and their statuses.
     */
    function getAtomicMessageStatuses(string[] calldata msgIds) external view virtual returns (MessageStatusResult[] memory) {
        // Initialize an array to hold the results
        MessageStatusResult[] memory results = new MessageStatusResult[](msgIds.length);

        // Loop through the array of message IDs
        for (uint256 i = 0; i < msgIds.length; i++) {
            // Get the status of the current message ID
            Utils.MessageStatus _status = atomicTeleportMessages[msgIds[i]].status;

            // Store the msgId and string representation of the status in the struct
            results[i] = MessageStatusResult({
                msgId: msgIds[i],
                status: AtomicStatus[_status]
            });
        }

        // Return the array of results (msgId + status)
        return results;
    }

    ///@dev returns the contract version
    function contractVersion() external pure virtual returns (uint256) {
        return 1;
    }
}
