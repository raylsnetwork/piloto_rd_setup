// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/// @title DeploymentRegistry
/// @notice A registry for tracking contract deployments in the Private Ledger system
/// @dev Implements UUPS proxy upgradeability and Access Control for secure upgrades
contract DeploymentRegistry is Initializable, UUPSUpgradeable, AccessControlUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256('UPGRADER_ROLE');

    struct Deployment {
        bool exists;
        address messageExecutorAddress;
        address endpointAddress;
        address contractFactoryAddress;
        address participantStorageAddress;
    }

    mapping(string => Deployment) public deployments;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the DeploymentRegistry contract
    /// @param admin The address to be granted the default admin and upgrader roles
    function initialize(address admin) public initializer {
        __UUPSUpgradeable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
    }

    /// @notice Fetches deployment details for a given version
    /// @param version The version identifier for the deployment
    /// @return Deployment struct containing deployment details
    function getDeployment(string calldata version) external view returns (Deployment memory) {
        return deployments[version];
    }

    /// @notice Saves deployment details for a specific version
    /// @dev Restricted to accounts with the DEFAULT_ADMIN_ROLE
    /// @param version The version identifier for the deployment
    /// @param messageExecutorAddress Address of the RaylsMessageExecutor contract
    /// @param endpointAddress Address of the Endpoint contract
    /// @param contractFactoryAddress Address of the RaylsContractFactory contract
    /// @param participantStorageAddress Address of the ParticipantStorageReplica contract
    function saveDeployment(
        string calldata version,
        address messageExecutorAddress,
        address endpointAddress,
        address contractFactoryAddress,
        address participantStorageAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        deployments[version] = Deployment({
            exists: true,
            messageExecutorAddress: messageExecutorAddress,
            endpointAddress: endpointAddress,
            contractFactoryAddress: contractFactoryAddress,
            participantStorageAddress: participantStorageAddress
        });
    }

    /// @dev Authorizes upgrades to the contract
    /// @param newImplementation The address of the new implementation
    /// @notice Restricted to accounts with the UPGRADER_ROLE
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
