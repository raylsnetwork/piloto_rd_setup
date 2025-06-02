// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '../../commitChain/ParticipantStorage/ParticipantStorageV1.sol';
import '../../rayls-protocol-sdk/RaylsAppV1.sol';
import '../../rayls-protocol-sdk/Constants.sol';
import './../interfaces/IParticipantValidator.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';

/**
 * @title ParticipantStorageReplica
 * @dev Smart contract for replicate the participants registered on commit chain into privacy ledgers.
 */
contract ParticipantStorageReplicaV1 is Initializable, RaylsAppV1, IParticipantValidator, UUPSUpgradeable, OwnableUpgradeable {
    // Array of participants
    ParticipantStorageV1.Participant[] internal participants;
    // Array of registered chainIds
    uint256[] internal registeredChainIds;
    // Mapping of chainId to index in the participants array + 1
    mapping(uint256 => uint256) internal chainIdToIndex;

    function initialize(address initialOwner, address _endpoint) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();

        RaylsAppV1.initialize(_endpoint);

        resourceId = Constants.RESOURCE_ID_PARTICIPANT_STORAGE;
        endpoint.registerResourceId(Constants.RESOURCE_ID_PARTICIPANT_STORAGE, address(this)); // resource registration to receive calls from commitchain
    }

    /**
     * @dev Add multiple Participants
     * @param _participants Array of Participants structs to add
     */
    function addOrUpdateParticipants(ParticipantStorageV1.Participant[] memory _participants) external virtual receiveMethod onlyFromCommitChain {
        for (uint256 i = 0; i < _participants.length; i++) {
            _addOrUpdateParticipant(_participants[i]);
        }
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

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
        } else {
            uint256 parsedIndex = index - 1;
            participants[parsedIndex] = _participant;
        }
    }

    /**
     * @dev Function to validate both message participants
     * @param originChainId ChainId of the message origin participant
     * @param destinationChainId ChainId of the message destination participant
     */
    function validateMessageParticipants(uint256 originChainId, uint256 destinationChainId) public view virtual {
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
     * @dev Sends a message to commit chain requesting all participant data
     */
    function requestAllParticipantsDataFromCommitChain() public virtual {
        BridgedTransferMetadata memory emptyMetadata;
        _raylsSendToResourceId(
            endpoint.getCommitChainId(),
            resourceId,
            abi.encodeWithSelector(ParticipantStorageV1.broadcastCurrentParticipants.selector),
            bytes(''),
            bytes(''),
            bytes(''),
            emptyMetadata
        );
    }

    function getAllParticipants() external view virtual returns (ParticipantStorageV1.Participant[] memory) {
        return participants;
    }

    ///@dev returns the contract version
    function contractVersion() external pure virtual returns (uint256) {
        return 1;
    }
}
