// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StorageBase.sol"; // Certifique-se de que o caminho está correto

contract EnygmaManager is StorageBase {
    event EnygmaDataAdded(uint256 chainId);

    function setEnygmaData(
        uint256 chainId,
        uint256 babyJubjubX,
        uint256 babyJubjubY,
        address[] calldata plAddresses
    ) external {
        require(enygmaData[chainId].babyJubjubX == 0, "Enygma data exists");
        enygmaData[chainId] = PrivateLedgerDataEnygma({
            babyJubjubX: babyJubjubX,
            babyJubjubY: babyJubjubY,
            plAddresses: plAddresses,
            chainId: chainId
        });
        allEnygmaParticipants.push(chainId);
        emit EnygmaDataAdded(chainId);
    }

    function getEnygmaData(uint256 chainId) external view returns (PrivateLedgerDataEnygma memory) {
        return enygmaData[chainId];
    }

    function getEnygmaAllParticipantsChainIds() external view returns (uint256[] memory) {
        return allEnygmaParticipants;
    }

    function validateEnygmaParticipant(uint256 chainId) external view {
        require(enygmaData[chainId].babyJubjubX != 0, "Enygma participant not registered");
    }
}