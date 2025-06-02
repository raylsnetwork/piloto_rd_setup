// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ParticipantManager.sol"; // Certifique-se de que o caminho está correto

contract ParticipantManagerV2 is ParticipantManager {
    
   

    event ParticipantUpdated(uint256 chainId, string name, string description);

    function addParticipant(
        uint256 chainId, 
        string calldata name, 
        string calldata description
    ) external {
        ParticipantStorageData storage data = _getStorage();
        require(data.participants[chainId].chainId == 0, "Participant exists");

        data.participants[chainId] = Participant({
            chainId: chainId,
            name: name,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            //description: description,
            __gap: emptyGap
        });

        registeredChainIds.push(chainId);
        emit ParticipantAdded(chainId, name);
    }

    function updateParticipant(uint256 chainId, string calldata name, string calldata description) external {
        ParticipantStorageData storage data = _getStorage();
        require(data.participants[chainId].chainId != 0, "Participant not found");

        data.participants[chainId].name = name;
        //data.participants[chainId].description = description;
        data.participants[chainId].updatedAt = block.timestamp;

        emit ParticipantUpdated(chainId, name, description);
    }

    function getParticipant(uint256 chainId) external view override returns (Participant memory) {
        return _getStorage().participants[chainId];
    }

    
}