// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/access/AccessControl.sol';

struct Deployment {
    address resourceRegistryAddress;
    address teleportAddress;
    address endpointAddress;
    address tokenRegistryAddress;
    address proofsAddress;
    address participantStorageAddress;
}
/// @title DeploymentProxyRegistry
/// @notice A registry for tracking Proxy contract deployments in the Private Ledger system

contract DeploymentProxyRegistry is AccessControl {
    event DeploymentUpdated(
        address indexed resourceRegistryAddress,
        address indexed teleportAddress,
        address indexed endpointAddress,
        address tokenRegistryAddress,
        address proofsAddress,
        address participantStorageAddress
    );

    Deployment public deployment;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Fetches deployment addresses
    /// @return Deployment struct containing deployment details
    function getDeployment() external view returns (Deployment memory) {
        return deployment;
    }

    /// @notice Sets deployment contract addresses
    /// @dev Restricted to accounts with the DEFAULT_ADMIN_ROLE
    /// @param resourceRegistryAddress Address of the Resource Registry proxy contract
    /// @param teleportAddress Address of the Teleport proxy contract
    /// @param endpointAddress Address of the Endpoint proxy contract
    /// @param tokenRegistryAddress Address of the Token Registry proxy contract
    /// @param proofsAddress Address of the Proofs proxy contract
    /// @param participantStorageAddress Address of the Participant Storage proxy contract
    function setDeployment(
        address resourceRegistryAddress,
        address teleportAddress,
        address endpointAddress,
        address tokenRegistryAddress,
        address proofsAddress,
        address participantStorageAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(deployment.endpointAddress == address(0), 'Deployment registry already defined.');
        require(resourceRegistryAddress != address(0), 'Invalid resourceRegistryAddress');
        require(teleportAddress != address(0), 'Invalid teleportAddress');
        require(endpointAddress != address(0), 'Invalid endpointAddress');
        require(tokenRegistryAddress != address(0), 'Invalid tokenRegistryAddress');
        require(proofsAddress != address(0), 'Invalid proofsAddress');
        require(participantStorageAddress != address(0), 'Invalid participantStorageAddress');

        deployment = Deployment({
            resourceRegistryAddress: resourceRegistryAddress,
            teleportAddress: teleportAddress,
            endpointAddress: endpointAddress,
            tokenRegistryAddress: tokenRegistryAddress,
            proofsAddress: proofsAddress,
            participantStorageAddress: participantStorageAddress
        });

        emit DeploymentUpdated(resourceRegistryAddress, teleportAddress, endpointAddress, tokenRegistryAddress, proofsAddress, participantStorageAddress);
    }
}
