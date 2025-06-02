// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./../utils/RaylsReentrancyGuardV1.sol";
import "../../rayls-protocol-sdk/interfaces/IRaylsEndpoint.sol";
import "../../rayls-protocol-sdk/RaylsMessage.sol";
import "./../RaylsContractFactory/RaylsContractFactoryV1.sol";
import "./../RaylsMessageExecutor/RaylsMessageExecutorV1.sol";
import "./../ParticipantStorageReplica/ParticipantStorageReplicaV1.sol";
import "./../interfaces/IParticipantValidator.sol";
import "./../interfaces/ITokenRegistryValidator.sol";
import "../../MessageDispatcher.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract EndpointV1 is Initializable, IRaylsEndpoint, UUPSUpgradeable, OwnableUpgradeable, IMessageDispatcher {
    uint256 public chainId;
    uint256 public commitChainId;
    RaylsMessageExecutorV1 messageExecutor;
    RaylsContractFactoryV1 contractFactory;
    IParticipantValidator participantStorageReplica;
    ITokenRegistryValidator tokenRegistryReplica;
    uint256 private maxBatchMessages;
    /// @notice Nonce to ensure unique message IDs.
    uint256 nonce;

    // srcChainId => inboundNonce
    mapping(uint256 => uint256) public inboundNonce;
    // destChainId => outboundNonce
    mapping(uint256 => uint256) public outboundNonce;

    // contractAddress = [resourceId]
    mapping(bytes32 => address) public resourceIdToContractAddress;

    // Maps contract names to commit chain addresses
    mapping(string => address) public commitChainAddress;

    event UpdateDHKeysRequest(uint256 blockNumber);

    function initialize(address initialOwner, uint256 _chainId, uint256 _commitChainId, uint256 _maxBatchMessages)
        public
        initializer
    {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        commitChainId = _commitChainId;
        chainId = _chainId;
        maxBatchMessages = _maxBatchMessages;
        nonce = 0;
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function configureContracts(
        address _messageExecutor,
        address _contractFactory,
        address _participantStorageReplica,
        address _tokenRegistryReplica
    ) external virtual onlyOwner {
        messageExecutor = RaylsMessageExecutorV1(_messageExecutor);
        contractFactory = RaylsContractFactoryV1(_contractFactory);
        participantStorageReplica = IParticipantValidator(_participantStorageReplica);
        tokenRegistryReplica = ITokenRegistryValidator(_tokenRegistryReplica);
    }

    function getAddressByResourceId(bytes32 _resourceId) external view virtual returns (address) {
        return resourceIdToContractAddress[_resourceId];
    }

    function send(uint256 _dstChainId, address _destination, bytes calldata _payload)
        external
        payable
        virtual
        override
        returns (bytes32 messageId)
    {
        NewResourceMetadata memory emptyResourceMetadata;
        BridgedTransferMetadata memory emptyMetadata;
        return _send(
            SendRequest({
                dstChainId: _dstChainId,
                destination: _destination,
                payload: _payload,
                resourceId: bytes32(0),
                newResourceMetadata: emptyResourceMetadata,
                lockData: bytes(""),
                revertDataSender: bytes(""),
                revertDataReceiver: bytes(""),
                transferMetadata: emptyMetadata
            })
        );
    }

    function sendBatch(DestinationPayloadRequest[] calldata _destinationPayloadRequests)
        external
        returns (bytes32 batchId)
    {
        require(
            _destinationPayloadRequests.length < getMaxBatchMessages(),
            "The max number of transactions allowed in a batch has been exceeded"
        );

        SendRequest[] memory request = new SendRequest[](_destinationPayloadRequests.length);

        for (uint256 i = 0; i < _destinationPayloadRequests.length; i++) {
            NewResourceMetadata memory emptyResourceMetadata;
            BridgedTransferMetadata memory emptyMetadata;

            request[i] = SendRequest({
                dstChainId: _destinationPayloadRequests[i]._dstChainId,
                destination: _destinationPayloadRequests[i]._destination,
                payload: _destinationPayloadRequests[i]._payload,
                resourceId: bytes32(0),
                newResourceMetadata: emptyResourceMetadata,
                lockData: bytes(""),
                revertDataSender: bytes(""),
                revertDataReceiver: bytes(""),
                transferMetadata: emptyMetadata
            });
        }

        return _sendBatch(request);
    }

    function sendToResourceId(uint256 _dstChainId, bytes32 _resourceId, bytes calldata _payload)
        external
        payable
        virtual
        returns (bytes32 messageId)
    {
        BridgedTransferMetadata memory emptyMetadata;
        NewResourceMetadata memory emptyResourceMetadata;

        if (_dstChainId == 0) {
            ParticipantStorageV1.Participant[] memory participants = participantStorageReplica.getAllParticipants();

            // Check if we are allowed to broadcast messages
            bool isAllowedToSend;
            for (uint256 i = 0; i < participants.length; i++) {
                if (participants[i].chainId == chainId) {
                    isAllowedToSend = participants[i].allowedToBroadcast;
                }
            }

            require(isAllowedToSend, "Participant is not allowed to broadcast messages");

            if (isAllowedToSend) {
                for (uint256 i = 0; i < participants.length; i++) {
                    uint256 participantChainId = participants[i].chainId;

                    // Check if the current participant chaindId is not ours and not the VEN operator
                    if (participantChainId != chainId && participantChainId != Constants.OPERATOR_CHAIN_ID) {
                        // Check if the participant we are about to send is in active status (1 means it is active)
                        bool isAllowedToReceive = participants[i].status == ParticipantStorageV1.Status.ACTIVE;
                        if (isAllowedToReceive) {
                            messageId = _send(
                                SendRequest({
                                    dstChainId: participantChainId,
                                    destination: address(0),
                                    payload: _payload,
                                    resourceId: _resourceId,
                                    newResourceMetadata: emptyResourceMetadata,
                                    lockData: bytes(""),
                                    revertDataSender: bytes(""),
                                    revertDataReceiver: bytes(""),
                                    transferMetadata: emptyMetadata
                                })
                            );
                        }
                    }
                }
            }

            return messageId;
        }

        return _send(
            SendRequest({
                dstChainId: _dstChainId,
                destination: address(0),
                payload: _payload,
                resourceId: _resourceId,
                newResourceMetadata: emptyResourceMetadata,
                lockData: bytes(""),
                revertDataSender: bytes(""),
                revertDataReceiver: bytes(""),
                transferMetadata: emptyMetadata
            })
        );
    }

    function sendBatchToResourceId(ResourceIdPayloadRequest[] calldata _resourceIdPayloadRequests)
        external
        payable
        virtual
        returns (bytes32 batchId)
    {
        require(
            _resourceIdPayloadRequests.length < getMaxBatchMessages(),
            "The max number of transactions allowed in a batch has been exceeded"
        );

        SendRequest[] memory request = new SendRequest[](_resourceIdPayloadRequests.length);

        for (uint256 i = 0; i < _resourceIdPayloadRequests.length; i++) {
            NewResourceMetadata memory emptyResourceMetadata;
            BridgedTransferMetadata memory emptyMetadata;

            request[i] = SendRequest({
                dstChainId: _resourceIdPayloadRequests[i]._dstChainId,
                destination: address(0),
                payload: _resourceIdPayloadRequests[i]._payload,
                resourceId: _resourceIdPayloadRequests[i]._resourceId,
                newResourceMetadata: emptyResourceMetadata,
                lockData: bytes(""),
                revertDataSender: bytes(""),
                revertDataReceiver: bytes(""),
                transferMetadata: emptyMetadata
            });
        }

        return _sendBatch(request);
    }

    function sendToResourceId(
        uint256 _dstChainId,
        bytes32 _resourceId,
        bytes calldata _payload,
        bytes memory _lockData,
        bytes memory _revertDataSender,
        bytes memory _revertDataReceiver,
        BridgedTransferMetadata memory transferMetadata
    ) external payable virtual returns (bytes32 messageId) {
        NewResourceMetadata memory emptyResourceMetadata;
        return _send(
            SendRequest({
                dstChainId: _dstChainId,
                destination: address(0),
                payload: _payload,
                resourceId: _resourceId,
                newResourceMetadata: emptyResourceMetadata,
                lockData: _lockData,
                revertDataSender: _revertDataSender,
                revertDataReceiver: _revertDataReceiver,
                transferMetadata: transferMetadata
            })
        );
    }

    function sendBatchToResourceId(ResourceIdCompletePayloadRequest[] calldata _resourceIdPayloadRequests)
        external
        payable
        virtual
        returns (bytes32 batchId)
    {
        require(
            _resourceIdPayloadRequests.length < getMaxBatchMessages(),
            "The max number of transactions allowed in a batch has been exceeded"
        );

        SendRequest[] memory request = new SendRequest[](_resourceIdPayloadRequests.length);

        for (uint256 i = 0; i < _resourceIdPayloadRequests.length; i++) {
            NewResourceMetadata memory emptyResourceMetadata;

            request[i] = SendRequest({
                dstChainId: _resourceIdPayloadRequests[i]._dstChainId,
                destination: address(0),
                payload: _resourceIdPayloadRequests[i]._payload,
                resourceId: _resourceIdPayloadRequests[i]._resourceId,
                newResourceMetadata: emptyResourceMetadata,
                lockData: _resourceIdPayloadRequests[i]._lockData,
                revertDataSender: _resourceIdPayloadRequests[i]._revertDataSender,
                revertDataReceiver: _resourceIdPayloadRequests[i]._revertDataReceiver,
                transferMetadata: _resourceIdPayloadRequests[i].transferMetadata
            });
        }

        return _sendBatch(request);
    }

    function _sendBatch(SendRequest[] memory request) internal virtual returns (bytes32) {
        for (uint256 i = 0; i < request.length; i++) {
            participantStorageReplica.validateMessageParticipants(chainId, request[i].dstChainId);
            tokenRegistryReplica.validateTokenForParticipant(request[i].resourceId, chainId);
            tokenRegistryReplica.validateTokenForParticipant(request[i].resourceId, request[i].dstChainId);
        }

        BatchMessage[] memory messages = new BatchMessage[](request.length);

        for (uint256 i = 0; i < request.length; i++) {
            uint256 internalNonce = ++outboundNonce[request[i].dstChainId];

            RaylsMessage memory _messagePayload = RaylsMessage({
                messageMetadata: RaylsMessageMetadata({
                    valid: true,
                    nonce: internalNonce,
                    newResourceMetadata: request[i].newResourceMetadata,
                    resourceId: request[i].resourceId,
                    transferMetadata: request[i].transferMetadata,
                    lockData: request[i].lockData,
                    revertPayloadDataSender: request[i].revertDataSender,
                    revertPayloadDataReceiver: request[i].revertDataReceiver,
                    ignoresNonce: true
                }),
                payload: request[i].payload
            });

            bytes32 _messageId = MessageLib.computeMessageId(
                chainId, msg.sender, request[i].dstChainId, request[i].destination, abi.encode(_messagePayload)
            );

            if (request[i].dstChainId == chainId) {
                receivePayload(chainId, msg.sender, request[i].destination, _messagePayload, _messageId);
            }

            messages[i] = BatchMessage({
                toChainId: request[i].dstChainId,
                to: request[i].destination,
                data: _messagePayload,
                messageId: _messageId
            });
        }

        bytes32 _batchId = MessageLib.computeMessageBatchId(chainId, msg.sender, request);

        bytes32 batchId = dispatchMessageBatch(_batchId, msg.sender, messages);

        require(batchId == _batchId, "dispatchMessageBatch should return batchId");

        return _batchId;
    }

    function _send(SendRequest memory request) internal virtual returns (bytes32) {
        uint256 internalNonce = ++outboundNonce[request.dstChainId];

        participantStorageReplica.validateMessageParticipants(chainId, request.dstChainId);

        RaylsMessage memory _messagePayload = RaylsMessage({
            messageMetadata: RaylsMessageMetadata({
                valid: true,
                nonce: internalNonce,
                newResourceMetadata: request.newResourceMetadata,
                resourceId: request.resourceId,
                transferMetadata: request.transferMetadata,
                lockData: request.lockData,
                revertPayloadDataSender: request.revertDataSender,
                revertPayloadDataReceiver: request.revertDataReceiver,
                ignoresNonce: true
            }),
            payload: request.payload
        });
        bytes32 _messageId = MessageLib.computeMessageId(
            chainId, msg.sender, request.dstChainId, request.destination, abi.encode(_messagePayload)
        );

        if (request.dstChainId == chainId) {
            receivePayload(chainId, msg.sender, request.destination, _messagePayload, _messageId);
        } else {
            bytes32 messageId =
                dispatchMessage(_messageId, msg.sender, request.dstChainId, request.destination, _messagePayload);

            require(messageId == _messageId, "dispatchMessage should return messageId");
        }
        return _messageId;
    }

    function _validateRaylsMessageAndGetPayload(
        uint256 _srcChainId,
        address _dstAddress,
        RaylsMessage memory _raylsMessage
    ) internal virtual returns (bytes memory payload, address destinationAddress) {
        destinationAddress = _validadeRaylsMessageMetadata(_srcChainId, _dstAddress, _raylsMessage.messageMetadata);
        return (_raylsMessage.payload, destinationAddress);
    }

    function _validadeRaylsMessageMetadata(
        uint256 _srcChainId,
        address _dstAddress,
        RaylsMessageMetadata memory _messageMetadata
    ) internal virtual returns (address destinationAddress) {
        // assert and increment the nonce. no message shuffling
        if (!_messageMetadata.ignoresNonce) {
            require(_messageMetadata.nonce == ++inboundNonce[_srcChainId], "Rayls: wrong nonce");
        }

        destinationAddress = _handleWithResourceId(_messageMetadata, _dstAddress);

        return destinationAddress;
    }

    function _handleWithResourceId(RaylsMessageMetadata memory raylsMessageMetadata, address _dstAddress)
        internal
        virtual
        returns (address destinationAddress)
    {
        require(
            _dstAddress != address(0) || raylsMessageMetadata.newResourceMetadata.valid
                || raylsMessageMetadata.resourceId != bytes32(0),
            "Rayls: No valid destination specified"
        );

        if (_dstAddress != address(0)) return _dstAddress;

        if (raylsMessageMetadata.newResourceMetadata.valid) {
            if (resourceIdToContractAddress[raylsMessageMetadata.resourceId] != address(0)) {
                return resourceIdToContractAddress[raylsMessageMetadata.resourceId];
            }

            address deployedAddress = contractFactory.deploy(
                raylsMessageMetadata.newResourceMetadata.bytecode,
                raylsMessageMetadata.newResourceMetadata.initializerParams,
                raylsMessageMetadata.resourceId
            );
            this.registerResourceId(raylsMessageMetadata.resourceId, deployedAddress);
            return deployedAddress;
        }
        if (raylsMessageMetadata.resourceId != bytes32(0)) {
            return resourceIdToContractAddress[raylsMessageMetadata.resourceId];
        }

        revert("Rayls: No valid destination specified");
    }

    function registerResourceId(bytes32 _resourceId, address _implementationAddress) external virtual {
        resourceIdToContractAddress[_resourceId] = _implementationAddress;
    }

    function receivePayload(
        uint256 _srcChainId,
        address _srcAddress,
        address _dstAddress,
        RaylsMessage memory _raylsMessage,
        bytes32 _messageId
    ) public virtual override {
        (bytes memory payload, address destinationAddress) =
            _validateRaylsMessageAndGetPayload(_srcChainId, _dstAddress, _raylsMessage);

        messageExecutor.executeMessage(destinationAddress, payload, _messageId, _srcChainId, _srcAddress);
    }

    function getInboundNonce(uint256 _srcChainId) external view virtual override returns (uint256) {
        return inboundNonce[_srcChainId];
    }

    function getOutboundNonce(uint256 _dstChainId) external view virtual override returns (uint256) {
        return outboundNonce[_dstChainId];
    }

    function getChainId() external view virtual override returns (uint256) {
        return chainId;
    }

    function getCommitChainId() external view virtual override returns (uint256) {
        return commitChainId;
    }

    function registerCommitChainAddress(string memory _contractName, address _contractAddressOnCommitChain)
        external
        virtual
        override
    {
        commitChainAddress[_contractName] = _contractAddressOnCommitChain;
    }

    function setMaxBatchMessages(uint256 _maxBatchMessages) public onlyOwner {
        maxBatchMessages = _maxBatchMessages;
    }

    function getMaxBatchMessages() public view returns (uint256) {
        return maxBatchMessages;
    }

    /**
     * @notice Dispatch a message to another chain and emit the associated event.
     * @param from The address sending the message.
     * @param toChainId The unique identifier to the chain to which the message will be delivered
     * @param to The address on the target chain to which the message will be delivered.
     * @param data The call data to send with the message.
     * @param messageId A unique identifier for the dispatched message.
     * @return messageId A unique identifier for the dispatched message.
     */
    function dispatchMessage(bytes32 messageId, address from, uint256 toChainId, address to, RaylsMessage memory data)
        public
        payable
        returns (bytes32)
    {
        emit MessageDispatched(messageId, from, toChainId, to, data);
        return messageId;
    }

    /**
     * @notice Dispatch a message batch to another chain and emit the associated event.
     * @param batchId A unique identifier for the dispatched batch.
     * @param from The address sending the message batch.
     * @param messages The messages being dispatched on the batch.
     * @return batchId A unique identifier for the dispatched batch.
     */
    function dispatchMessageBatch(bytes32 batchId, address from, BatchMessage[] memory messages)
        public
        returns (bytes32)
    {
        emit MessageBatchDispatched(batchId, from, messages);
        return batchId;
    }

    /**
     * @dev Internal function to increment the nonce.
     * @return The current value of the nonce after incrementing.
     */
    function _incrementNonce() internal returns (uint256) {
        unchecked {
            nonce++;
        }

        return nonce;
    }

    /**
     * @notice Gets a contract address from commit chain by it's name
     * @param _contractName The name of the contract
     */
    function getCommitChainAddress(string memory _contractName) external view virtual override returns (address) {
        require(
            commitChainAddress[_contractName] != (address(0)),
            string(abi.encodePacked("Commit chain contract '", _contractName, "' not mapped on endpoint"))
        );
        return commitChainAddress[_contractName];
    }

    /**
     * @notice Check if is a trusted executor address.
     * @param _executor Address to check
     */
    function isTrustedExecutor(address _executor) public view virtual returns (bool) {
        return _executor == address(messageExecutor);
    }

    /**
     * @notice Retrieves the protocol version .
     * @return The protocol version.
     */
    function version() external pure virtual returns (string memory) {
        return "1.8";
    }

    ///@dev returns the contract version
    function contractVersion() external pure virtual returns (uint256) {
        return 1;
    }

    ///@dev Entrypoint for triggering DH key update flow
    /// TODO bring back onlyOwner once done testing
    function requestNewDHKeys(uint256 blockNumber) public virtual onlyOwner {
        emit UpdateDHKeysRequest(blockNumber);
    }
}
