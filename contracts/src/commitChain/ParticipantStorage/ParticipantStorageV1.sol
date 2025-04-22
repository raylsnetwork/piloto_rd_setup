// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '../../rayls-protocol-sdk/RaylsAppV1.sol';
import '../../rayls-protocol-sdk/Constants.sol';
import '../../rayls-protocol/ParticipantStorageReplica/ParticipantStorageReplicaV1.sol';
import '../../rayls-protocol/interfaces/IParticipantValidator.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';

/**
 * @title ParticipantStorage
 * @dev Smart contract for managing a list of participants on the CC.
 */
contract ParticipantStorageV1 is Initializable, RaylsAppV1, IParticipantValidator, UUPSUpgradeable, OwnableUpgradeable {
    // Array of participants
    Participant[] internal participants;
    // Array of registered chainIds
    uint256[] internal registeredChainIds;
    // Mapping of chainId to index in the participants array + 1
    mapping(uint256 => uint256) internal chainIdToIndex;
    mapping(uint256 => AuditInfoData[]) public auditInfoData;
    mapping(uint256 => PrivateLedgerData[]) public privateLedgerData;

    mapping(uint256 => PrivateLedgerDataEnygma) internal enygmaData;

    uint256[] public allAuditInfoChainIds;
    uint256[] public allPrivateLedgerChainIds;

    uint256[] public allEnygmaParticipants;
    address public plEnygmaEvents;

    event NewAuditOrChainInfo();
    event ParticipantUpdated(Participant);
    event ParticipantRegistered(Participant);

    enum Status {
        NEW,
        ACTIVE,
        INACTIVE,
        FROZEN
    }

    enum Role {
        PARTICIPANT,
        ISSUER,
        AUDITOR
    }

    struct Participant {
        uint256 chainId;
        Role role;
        Status status;
        string ownerId;
        string name;
        uint256 createdAt;
        uint256 updatedAt;
        bool allowedToBroadcast;
    }

    // Struct representing the input data for adding a participant
    struct ParticipantData {
        uint256 chainId;
        Role role;
        string ownerId;
        string name;
    }

    struct AuditInfoData {
        uint256 chainId;
        string publicKey;
        bytes encryptedPrivateKey;
        bytes mac;
        uint256 blockNumber;
    }

    struct PrivateLedgerData {
        uint256 chainId;
        string publicKey;
        uint256 blockNumber;
    }

    struct PrivateLedgerDataEnygma {
        uint256 babyJubjubX;
        uint256 babyJubjubY;
        address[] plAddresses;
        uint256 chainId;
    }

    struct PrivateLedgerDataEnygmaSafeReturn {
        uint256 babyJubjubX;
        uint256 babyJubjubY;
        address[] plAddresses;
        uint256 chainId;
    }

    struct PrivateLedgerDataEnygmaSecretSafeReturn {
        uint256 secret;
        uint256 chainId;
    }

    function initialize(address initialOwner, address _endpoint) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
        RaylsAppV1.initialize(_endpoint);
        resourceId = Constants.RESOURCE_ID_PARTICIPANT_STORAGE;
        endpoint.registerResourceId(Constants.RESOURCE_ID_PARTICIPANT_STORAGE, address(this)); // resource registration to receive calls from commitchain
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    /**
     * @dev Get Participant by chainId
     * @param chainId ChainId of the participant to get
     */
    function getParticipant(uint256 chainId) external view virtual returns (Participant memory) {
        return getParticipantByChainId(chainId);
    }

    /**
     * @dev Get all registered chainIds
     */
    function getAllParticipantsChainIds() external view virtual returns (uint256[] memory) {
        return registeredChainIds;
    }

    /**
     * @dev Get all registered participants
     */
    function getAllParticipants() external view virtual returns (Participant[] memory) {
        return participants;
    }

    /**
     * @dev Add a Participant
     * @param _participant Participant struct to add
     */
    function addParticipant(ParticipantData memory _participant) external virtual onlyOwner {
        _addParticipant(_participant);
    }

    /**
     * @dev Add multiple Participants
     * @param _participants Array of Participants structs to add
     */
    function addParticipants(ParticipantData[] memory _participants) external virtual onlyOwner {
        for (uint256 i = 0; i < _participants.length; i++) {
            _addParticipant(_participants[i]);
        }
    }

    /**
     * @dev Internal abstraction function to add or udpate a participant
     * @param _participant Participant struct to add
     */
    function _addOrUpdateParticipant(ParticipantStorageV1.Participant memory _participant) internal virtual {
        uint256 chainId = _participant.chainId;
        uint256 index = chainIdToIndex[chainId];

        if (index == 0) {
            participants.push(_participant);
            registeredChainIds.push(chainId);
            chainIdToIndex[chainId] = participants.length;
            emit ParticipantRegistered(_participant);
        } else {
            uint256 parsedIndex = index - 1;
            participants[parsedIndex] = _participant;
            emit ParticipantUpdated(_participant);
        }

        _broadCastParticipant(_participant);
    }

    /**
     * @dev Broadcast a participant data to all participants of the VEN
     * @param _participant Participant struct
     */
    function _broadCastParticipant(ParticipantStorageV1.Participant memory _participant) internal virtual {
        BridgedTransferMetadata memory emptyMetadata;

        ParticipantStorageV1.Participant[] memory _crossChainRequest = new ParticipantStorageV1.Participant[](1);
        _crossChainRequest[0] = _participant;

        _raylsSendToResourceId(
            Constants.CHAIN_ID_ALL_PARTICIPANTS,
            resourceId,
            abi.encodeWithSelector(ParticipantStorageReplicaV1.addOrUpdateParticipants.selector, _crossChainRequest),
            bytes(''),
            bytes(''),
            bytes(''),
            emptyMetadata
        );
    }

    /**
     * @dev Broadcast all current participants to the request chain
     */
    function broadcastCurrentParticipants() public virtual receiveMethod {
        BridgedTransferMetadata memory emptyMetadata;
        _raylsSendToResourceId(
            _getFromChainIdOnReceiveMethod(),
            resourceId,
            abi.encodeWithSelector(ParticipantStorageReplicaV1.addOrUpdateParticipants.selector, participants),
            bytes(''),
            bytes(''),
            bytes(''),
            emptyMetadata
        );
    }

    /**
     * @dev Function to validate both message participants
     * @param originChainId ChainId of the message origin participant
     * @param destinationChainId ChainId of the message destination participant
     */
    function validateMessageParticipants(uint256 originChainId, uint256 destinationChainId) public view virtual {
        if (originChainId == endpoint.getCommitChainId()) return;
        if (destinationChainId == endpoint.getCommitChainId()) return;
        _validateParticipantStatus(originChainId);
        _validateParticipantStatus(destinationChainId);
    }

    /**
     * @dev Internal abstraction function to validate a participant given a chainId
     * @param chainId ChainId of the participant to validate
     */
    function _validateParticipantStatus(uint256 chainId) internal view virtual {
        if (chainId == 0) return;
        uint256 index = chainIdToIndex[chainId];
        require(index > 0, 'Participant not registered');
        uint256 parsedIndex = index - 1;
        require(participants[parsedIndex].status == ParticipantStorageV1.Status.ACTIVE, 'Participant not in an active status');
    }

    /**
     * @dev Internal abstraction function to add a participant
     * @param _participant Participant struct to add
     */
    function _addParticipant(ParticipantData memory _participant) internal virtual {
        uint256 chainId = _participant.chainId;
        bool participantExists = verifyParticipant(chainId);

        if (participantExists) {
            revert('Participant already exists');
        }

        Participant memory parsedParticipant = Participant({
            chainId: chainId,
            status: Status.NEW,
            role: _participant.role,
            ownerId: _participant.ownerId,
            name: _participant.name,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            allowedToBroadcast: false
        });

        _addOrUpdateParticipant(parsedParticipant);
    }

    /**
     * @dev Update Participants
     * @param chainId ChainId of the participant to update
     * @param status New status of the participant
     */
    function updateStatus(uint256 chainId, Status status) public virtual {
        Participant storage participant = getParticipantByChainId(chainId);

        if (participant.status == status) {
            revert('Status already set');
        }

        Participant memory parsedParticipant = Participant({
            chainId: chainId,
            status: status,
            role: participant.role,
            ownerId: participant.ownerId,
            name: participant.name,
            createdAt: participant.createdAt,
            updatedAt: block.timestamp,
            allowedToBroadcast: participant.allowedToBroadcast
        });

        _addOrUpdateParticipant(parsedParticipant);
    }

    /**
     * @dev Update Participants
     * @param chainId ChainId of the participant to update
     * @param role New role of the participant
     */
    function updateRole(uint256 chainId, Role role) external virtual {
        Participant storage participant = getParticipantByChainId(chainId);

        if (participant.role == role) {
            revert('Role already set');
        }

        Participant memory parsedParticipant = Participant({
            chainId: chainId,
            status: participant.status,
            role: role,
            ownerId: participant.ownerId,
            name: participant.name,
            createdAt: participant.createdAt,
            updatedAt: block.timestamp,
            allowedToBroadcast: participant.allowedToBroadcast
        });

        _addOrUpdateParticipant(parsedParticipant);
    }

    /**
     * @dev Update broadcast messages permission for a participant
     * @param chainId ChainId of the participant to update
     * @param allowed New broadcast permission value
     */
    function updateBroadcastMessagesPermission(uint256 chainId, bool allowed) public virtual onlyOwner {
        Participant storage participant = getParticipantByChainId(chainId);

        if (participant.allowedToBroadcast == allowed) {
            revert('Broadcast permission already set to requested value');
        }

        Participant memory parsedParticipant = Participant({
            chainId: chainId,
            status: participant.status,
            role: participant.role,
            ownerId: participant.ownerId,
            name: participant.name,
            createdAt: participant.createdAt,
            updatedAt: block.timestamp,
            allowedToBroadcast: allowed
        });

        _addOrUpdateParticipant(parsedParticipant);
    }

    /**
     * @dev Remove Participant
     * @param chainId ChainId of the participant to remove
     */
    function removeParticipant(uint256 chainId) external virtual {
        updateStatus(chainId, Status.INACTIVE);
    }

    /**
     * @dev Verify Participants on whether it exists and has status active
     * @param chainId ChainId of the participant to verify
     */
    function verifyParticipant(uint256 chainId) public view virtual returns (bool) {
        uint256 index = chainIdToIndex[chainId];

        if (index == 0) {
            return false;
        }
        uint256 parsedIndex = index - 1;

        if (participants[parsedIndex].status != Status.ACTIVE) {
            return false;
        }

        return true;
    }

    /**
     * @dev Internal abstraction function with validation to get a participant by chainId
     * @param chainId ChainId of the participant to get
     */
    function getParticipantByChainId(uint256 chainId) internal view virtual returns (Participant storage) {
        uint256 index = chainIdToIndex[chainId];
        require(index > 0, 'Participant not registered');

        // -1 to get the correct index
        uint256 parsedIndex = index - 1;

        return participants[parsedIndex];
    }

    function setAuditInfo(uint256 chainId, string calldata publicKey, bytes memory encryptedPrivateKey, bytes memory mac, uint256 blockNumber) public virtual {
        require(verifyParticipant(chainId), 'Participant does not exist or is not in Active status');
        // Verify newer block
        if (auditInfoData[chainId].length > 0) {
            require(auditInfoData[chainId][auditInfoData[chainId].length - 1].blockNumber < blockNumber, 'Block number is low');
        }
        // Create new AuditInfoData
        AuditInfoData memory newAuditInfo = AuditInfoData({chainId: chainId, publicKey: publicKey, encryptedPrivateKey: encryptedPrivateKey, mac: mac, blockNumber: blockNumber});

        // Add to the array
        auditInfoData[chainId].push(newAuditInfo);

        // Add chainId to list if it's the first entry
        if (auditInfoData[chainId].length == 1) {
            allAuditInfoChainIds.push(chainId);
        }

        emit NewAuditOrChainInfo();
    }

    function setChainInfo(uint256 chainId, string calldata publicKey, uint256 blockNumber) public virtual {
        require(verifyParticipant(chainId), 'Participant does not exist or is not in Active status');
        // Verify newer block
        if (privateLedgerData[chainId].length > 0) {
            require(privateLedgerData[chainId][privateLedgerData[chainId].length - 1].blockNumber < blockNumber, 'Block number is low');
        }
        // Create new PrivateLedgerData
        PrivateLedgerData memory newLedgerData = PrivateLedgerData({chainId: chainId, publicKey: publicKey, blockNumber: blockNumber});

        // Add to the array
        privateLedgerData[chainId].push(newLedgerData);

        // Add chainId to list if it's the first entry
        if (privateLedgerData[chainId].length == 1) {
            allPrivateLedgerChainIds.push(chainId);
        }

        emit NewAuditOrChainInfo();
    }

    /**
     * @notice Retrieves all private ledgers.
     * @return An array of all private ledger chain IDs.
     */
    function getAllPrivateLedgers() public view virtual returns (uint256[] memory) {
        return allPrivateLedgerChainIds;
    }

    /**
     * @notice Retrieves audit info of the chain to be used by the VEN Operator
     * @param chainId The ID of the chain.
     * @return data The array of AuditInfoData associated with the chain
     */
    function getAuditInfo(uint256 chainId) public view virtual returns (AuditInfoData[] memory data) {
        return auditInfoData[chainId];
    }

    /**
     * @notice Retrieves the DH public key for a given chainId.
     * @param chainId The ID of the chain.
     * @return data The array of PrivateLedgerData associated with the chainId.
     */
    function getChainInfo(uint256 chainId) public view virtual returns (PrivateLedgerData[] memory data) {
        return privateLedgerData[chainId];
    }

    function getParticipantDataBatch() public view virtual returns (PrivateLedgerData[] memory plData, AuditInfoData[] memory auditInfo, uint256[] memory plChainIds, uint256[] memory auditChainIds) {
        uint256 totalPrivateLedgerEntries = 0;
        uint256 totalAuditInfoEntries = 0;

        // Calculate total entries for private ledgers
        for (uint256 i = 0; i < allPrivateLedgerChainIds.length; i++) {
            uint256 chainId = allPrivateLedgerChainIds[i];
            totalPrivateLedgerEntries += privateLedgerData[chainId].length;
        }

        // Calculate total entries for audit info
        for (uint256 i = 0; i < allAuditInfoChainIds.length; i++) {
            uint256 chainId = allAuditInfoChainIds[i];
            totalAuditInfoEntries += auditInfoData[chainId].length;
        }

        plData = new PrivateLedgerData[](totalPrivateLedgerEntries);
        plChainIds = allPrivateLedgerChainIds;

        auditInfo = new AuditInfoData[](totalAuditInfoEntries);
        auditChainIds = allAuditInfoChainIds;

        // Collect private ledger data
        uint256 plIndex = 0;
        for (uint256 i = 0; i < allPrivateLedgerChainIds.length; i++) {
            uint256 chainId = allPrivateLedgerChainIds[i];

            PrivateLedgerData[] memory ledgerArray = privateLedgerData[chainId];
            for (uint256 j = 0; j < ledgerArray.length; j++) {
                plData[plIndex] = ledgerArray[j];
                plIndex++;
            }
        }

        // Collect audit info data
        uint256 auditIndex = 0;
        for (uint256 i = 0; i < allAuditInfoChainIds.length; i++) {
            uint256 chainId = allAuditInfoChainIds[i];

            AuditInfoData[] memory auditArray = auditInfoData[chainId];
            for (uint256 j = 0; j < auditArray.length; j++) {
                auditInfo[auditIndex] = auditArray[j];
                auditIndex++;
            }
        }
    }

    function setEnygmaBabyJubjubKeys(uint256 _chainId, uint256 _babyJubjubX, uint256 _babyJubjubY, address[] calldata _plAddresses) public virtual {
        require(enygmaData[_chainId].babyJubjubX == 0, 'Enygma Data for this chainId is already set!');
        require(verifyParticipant(_chainId), 'Participant not exists or not with an Active Status');

        enygmaData[_chainId].babyJubjubX = _babyJubjubX;
        enygmaData[_chainId].babyJubjubY = _babyJubjubY;

        for (uint256 index = 0; index < _plAddresses.length; index++) {
            enygmaData[_chainId].plAddresses = _plAddresses;
        }

        enygmaData[_chainId].chainId = _chainId;
        allEnygmaParticipants.push(_chainId);
    }

    function getEnygmaBabyJubjubKeysByChainId(uint256 chainId) public view virtual returns (uint256, uint256) {
        return (enygmaData[chainId].babyJubjubX, enygmaData[chainId].babyJubjubY);
    }

    function getEnygmaAllBabyJubjubKeys() public view virtual returns (PrivateLedgerDataEnygmaSafeReturn[] memory) {
        uint256 totalParticipants = allEnygmaParticipants.length;
        PrivateLedgerDataEnygmaSafeReturn[] memory plDataEnygmaSafe = new PrivateLedgerDataEnygmaSafeReturn[](totalParticipants);

        for (uint256 i = 0; i < totalParticipants; i++) {
            uint256 chainId = allEnygmaParticipants[i];
            plDataEnygmaSafe[i] = PrivateLedgerDataEnygmaSafeReturn(enygmaData[chainId].babyJubjubX, enygmaData[chainId].babyJubjubY, enygmaData[chainId].plAddresses, enygmaData[chainId].chainId);
        }

        return plDataEnygmaSafe;
    }

    function getEnygmaAllParticipantsChainIds() public view virtual returns (uint256[] memory) {
        return allEnygmaParticipants;
    }

    function checkEnygmaAccountAllowed(address _address) public view virtual returns (bool) {
        for (uint256 i = 0; i < allEnygmaParticipants.length; i++) {
            uint256 chainId = allEnygmaParticipants[i];
            for (uint256 j = 0; j < enygmaData[chainId].plAddresses.length; j++) {
                if (enygmaData[chainId].plAddresses[j] == _address) {
                    return true;
                }
            }
        }
        return false;
    }

    function checkEnygmaIssuerAccountAllowed(address _address, uint256 _chainId) public view virtual returns (bool) {
        for (uint256 i = 0; i < allEnygmaParticipants.length; i++) {
            if (allEnygmaParticipants[i] == _chainId) {
                address[] memory plAddresses = enygmaData[_chainId].plAddresses;
                for (uint256 j = 0; j < plAddresses.length; j++) {
                    if (plAddresses[j] == _address) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function setEnygmaPlEventsAddress(address _plEnygmaEvents) public virtual {
        plEnygmaEvents = _plEnygmaEvents;
    }

    ///@dev returns the contract version
    function contractVersion() external pure virtual returns (uint256) {
        return 1;
    }
}
