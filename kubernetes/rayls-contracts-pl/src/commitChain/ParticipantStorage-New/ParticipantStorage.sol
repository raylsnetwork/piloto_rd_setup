// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import "./ParticipantManager.sol"; 
import "./EnygmaManager.sol"; 
import "./BroadcastManager.sol"; 

contract ParticipantStorage is UUPSUpgradeable, OwnableUpgradeable {
    ParticipantManager private participantManager;
    EnygmaManager private enygmaManager;
    BroadcastManager private broadcastManager;

    function initialize(
        address owner,
        address _participantManager,
        address _enygmaManager,
        address _broadcastManager
    ) external initializer {
        require(owner != address(0), "Owner address cannot be zero");
        require(_participantManager != address(0), "ParticipantManager address cannot be zero");
        require(_enygmaManager != address(0), "EnygmaManager address cannot be zero");
        require(_broadcastManager != address(0), "BroadcastManager address cannot be zero");

        __Ownable_init(owner);
        __UUPSUpgradeable_init();
        participantManager = ParticipantManager(_participantManager);
        enygmaManager = EnygmaManager(_enygmaManager);
        broadcastManager = BroadcastManager(_broadcastManager);
    }

    function getStorageSlot() external view returns (bytes32) {
        return participantManager.getStorageSlot();
    }

    function configureParticipantManager (address _participantManager) virtual public {
        participantManager = ParticipantManager(_participantManager);
    }

    function getParticipantManager() external view returns (address _participantManager) {
        return address(participantManager);
    }

    function getEnygmaManager() external view returns (address _enygmaManager) {
        return address(enygmaManager);
    }

    function getBroadcastManager() external view returns (address _broadcastManager) {
        return address(broadcastManager);
    }

    function addParticipant(uint256 chainId, string calldata name) external {
        participantManager.addParticipant(chainId, name);
    }

    function updateParticipantName(uint256 chainId, string calldata name) external {
        participantManager.updateParticipantName(chainId, name);
    }

    function getParticipant(uint256 chainId) external view virtual returns (ParticipantManager.Participant memory) {
        return participantManager.getParticipant(chainId);
    }

    function validateParticipant(uint256 chainId) external view {
        participantManager.validateParticipant(chainId);
    }

    function broadcastParticipants() external returns (ParticipantManager.Participant[] memory) {
        return broadcastManager.broadcastParticipants();
    }

    function setEnygmaData(
        uint256 chainId,
        uint256 babyJubjubX,
        uint256 babyJubjubY,
        address[] calldata plAddresses
    ) external {
        enygmaManager.setEnygmaData(chainId, babyJubjubX, babyJubjubY, plAddresses);
    }

    function getEnygmaData(uint256 chainId) external view returns (EnygmaManager.PrivateLedgerDataEnygma memory) {
        return enygmaManager.getEnygmaData(chainId);
    }

    function getEnygmaAllParticipantsChainIds() external view returns (uint256[] memory) {
        return enygmaManager.getEnygmaAllParticipantsChainIds();
    }

    function validateEnygmaParticipant(uint256 chainId) external view {
        enygmaManager.validateEnygmaParticipant(chainId);
    }

    function broadcastEnygmaData() external returns (EnygmaManager.PrivateLedgerDataEnygma[] memory) {
        return broadcastManager.broadcastEnygmaData();
    }

    function validateMessageParticipants(uint256 originChainId, uint256 destinationChainId) external view {
        participantManager.validateParticipant(originChainId);
        participantManager.validateParticipant(destinationChainId);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}