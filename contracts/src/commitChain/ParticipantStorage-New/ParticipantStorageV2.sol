// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import "./ParticipantManagerV2.sol"; 
import "./EnygmaManager.sol"; 
import "./BroadcastManager.sol"; 
import "./ParticipantStorage.sol"; 


/// @dev Adds a new `description` field to the Participant struct
    

contract ParticipantStorageV2 is ParticipantStorage {
    ParticipantManagerV2 private participantManager;
    EnygmaManager private enygmaManager;
    BroadcastManager private broadcastManager;

    
  
    function configureParticipantManager(address _participantManager) override public {
        participantManager = ParticipantManagerV2(_participantManager);
    }

    function addParticipant(uint256 chainId, string calldata name, string calldata description) external {
        participantManager.addParticipant(chainId, name, description);
    }

    function updateParticipant(uint256 chainId, string calldata name, string calldata description) external {
        participantManager.updateParticipant(chainId, name, description);
    }

    function getParticipantV2(uint256 chainId) external view returns (ParticipantManager.Participant memory) {
        return participantManager.getParticipant(chainId);
    }

    
}