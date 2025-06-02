// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '../../rayls-protocol-sdk/libraries/SharedObjects.sol';

/**
 * ResourceRegistry contract
 *   Mapping a resource id based on bytecode and other metadata (to be decided)
 *   The mapping is between a resource id and a deployed address on a specific chainId
 */
contract ResourceRegistryV1 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    struct Resource {
        bytes32 resourceId;
        SharedObjects.ErcStandard standard;
        bytes bytecode;
        bytes initializerParams;
    }

    struct ResourceRegistryStorage {
        address tokenRegistryAt;
        Resource[] resources;
        mapping(bytes32 => uint256) resourceIndexById;
        uint256 RESOURCE_COUNTER;
    }

    // keccak256(abi.encode(uint256(keccak256("rayls.commitchain.ResourceRegistry")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant RESOURCE_REGISTRY_STORAGE = 0x41133c463db09c45ecb7411517181d19bb0412bd30f732cc22500e159f40c400;

    modifier onlyTokenRegistry() virtual {
        ResourceRegistryStorage storage $ = _getStorage();
        if ($.tokenRegistryAt == address(0)) {
            revert('No Token Registry set');
        }

        if (msg.sender != $.tokenRegistryAt) {
            revert('Unauthorized');
        }

        _;
    }

    function initialize(address initialOwner) public initializer {
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setTokenRegistry(address tokenRegistryAt) public virtual {
        ResourceRegistryStorage storage $ = _getStorage();
        $.tokenRegistryAt = tokenRegistryAt;
    }

    /**
     * @dev Register a new resource
     * @param standard The standard of the resource
     * @param bytecode The bytecode of the resource
     * @return resourceId The id of the resource
     */
    function registerResource(SharedObjects.ErcStandard standard, bytes memory bytecode, bytes memory initializerParams) public virtual onlyTokenRegistry returns (bytes32) {
        ResourceRegistryStorage storage $ = _getStorage();

        bytes32 resourceId = _generateResourceId();

        require($.resourceIndexById[resourceId] == 0, 'Resource already registered');

        $.resources.push(Resource({resourceId: resourceId, standard: standard, bytecode: bytecode, initializerParams: initializerParams}));
        $.resourceIndexById[resourceId] = $.resources.length;

        return resourceId;
    }

    function getResourceById(bytes32 resourceId) public view virtual returns (Resource memory) {
        return _getResourceById(resourceId);
    }

    function _getResourceById(bytes32 resourceId) internal view virtual returns (Resource storage) {
        ResourceRegistryStorage storage $ = _getStorage();

        uint256 resourceIndex = $.resourceIndexById[resourceId];

        if (resourceIndex == 0) {
            revert('Resource not found');
        }

        return $.resources[resourceIndex - 1];
    }

    function _generateResourceId() internal virtual returns (bytes32) {
        ResourceRegistryStorage storage $ = _getStorage();
        uint256 counter = $.RESOURCE_COUNTER;
        $.RESOURCE_COUNTER += 1;
        return keccak256(abi.encodePacked(counter));
    }

    /**
     * @dev Used to retrieve a pointer to the contract storage.
     */
    function _getStorage() internal pure virtual returns (ResourceRegistryStorage storage $) {
        assembly {
            $.slot := RESOURCE_REGISTRY_STORAGE
        }
    }

    ///@dev returns the contract version
    function contractVersion() external pure virtual returns (uint256) {
        return 1;
    }
}
