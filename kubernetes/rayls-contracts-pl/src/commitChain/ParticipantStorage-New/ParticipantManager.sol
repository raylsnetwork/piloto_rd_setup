// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';

import "./StorageBase.sol"; // Certifique-se de que o caminho está correto

contract ParticipantManager is UUPSUpgradeable, OwnableUpgradeable, StorageBase {
    event ParticipantAdded(uint256 chainId, string name);
    event ParticipantUpdated(uint256 chainId, string description);

    function initialize(
        address owner
    ) external initializer {
        require(owner != address(0), "Owner address cannot be zero");

        __Ownable_init(owner);
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function getStorageSlot() external pure virtual returns (bytes32) {
        return PARTICIPANT_STORAGE_SLOT;
    }

    function addParticipant(
        uint256 chainId, 
        string calldata name
    ) external {
        ParticipantStorageData storage data = _getStorage();
        
        require(data.participants[chainId].chainId == 0, "Participant exists");
        
        data.participants[chainId] = Participant({
            chainId: chainId,
            name: name,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            __gap: emptyGap
        });

        registeredChainIds.push(chainId);
        emit ParticipantAdded(chainId, name);
    }

    function updateParticipantName(uint256 chainId, string calldata name) external {
        ParticipantStorageData storage data = _getStorage();
        
        require(data.participants[chainId].chainId != 0, "Participant not found");

        data.participants[chainId].name = name;
        data.participants[chainId].updatedAt = block.timestamp;
        
        emit ParticipantUpdated(chainId, name);
    }

    function getParticipant(uint256 chainId) external virtual view returns (Participant memory) {
        return _getStorage().participants[chainId];
    }

    function validateParticipant(uint256 chainId) external view {
        require(_getStorage().participants[chainId].chainId != 0, "Participant not registered");
    }
}
