// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts/utils/Create2.sol';
import {RaylsBridgeableERC} from '../../rayls-protocol-sdk/RaylsMessage.sol';

contract RaylsContractFactoryV1 is Initializable, AccessControlUpgradeable, UUPSUpgradeable, OwnableUpgradeable {
    bytes32 public constant ENDPOINT_ROLE = keccak256('ENDPOINT_ROLE');
    bytes32 public constant FACTORY_ADMIN = keccak256('FACTORY_ADMIN');

    uint256 private saltCounter;
    address public endpoint;

    mapping(RaylsBridgeableERC => address) public templateToImplementationAddress;

    event DeployedContract(address indexed deployedAddress);

    function initialize(address _endpoint, address _owner) public initializer {
        __Ownable_init(_owner);
        _grantRole(ENDPOINT_ROLE, _endpoint);
        _grantRole(FACTORY_ADMIN, msg.sender);
        endpoint = _endpoint;
        saltCounter = 0;
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function deploy(bytes calldata bytecode, bytes calldata initializerParams, bytes32 resourceId) public virtual onlyRole(ENDPOINT_ROLE) returns (address deployedAddress) {
        address deployedContract = Create2.deploy(0, keccak256(abi.encodePacked(++saltCounter)), abi.encodePacked(_getInitCodeOfEmptyConstructor(bytecode), bytecode));
        (bool _success, ) = deployedContract.call(abi.encodePacked(initializerParams, endpoint, owner(), resourceId));
        if (!_success) {
            revert('Failed on contract initialization while deploying a resource locally');
        }
        emit DeployedContract(deployedContract);
        return deployedContract;
    }

    function _getInitCodeOfEmptyConstructor(bytes calldata bytecode) internal pure virtual returns (bytes memory) {
        bytes1 pushType = 0x61;
        bytes memory codeLength = abi.encodePacked(bytes2(uint16(bytecode.length)));
        if (bytecode.length <= 255) {
            pushType = 0x60;
            codeLength = abi.encodePacked(bytes1(uint8(bytecode.length)));
        }
        return abi.encodePacked(bytes18(0x608060405234801561001057600080fd5b50), pushType, codeLength, bytes11(0x806100206000396000f3fe));
    }

    ///@dev returns the contract version
    function contractVersion() external pure virtual returns (uint256) {
        return 1;
    }
}
