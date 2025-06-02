// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import 'forge-std/Test.sol';
import 'forge-std/console.sol';
import '../../src/commitChain/DeploymentProxyRegistry/DeploymentProxyRegistry.sol';

contract DeploymentProxyRegistryTest is Test {
    DeploymentProxyRegistry public deploymentProxyRegistry;

    address owner = address(1);
    address resourceRegistryAddress = address(2);
    address teleportAddress = address(3);
    address endpointAddress = address(4);
    address tokenRegistryAddress = address(5);
    address proofsAddress = address(6);
    address participantStorageAddress = address(7);

    function setUp() public {
        vm.prank(owner);
        deploymentProxyRegistry = new DeploymentProxyRegistry();
    }

    function testVerifyOwner() public {
        vm.expectRevert();
        deploymentProxyRegistry.setDeployment(resourceRegistryAddress, teleportAddress, endpointAddress, tokenRegistryAddress, proofsAddress, participantStorageAddress);

        vm.prank(owner);
        deploymentProxyRegistry.setDeployment(resourceRegistryAddress, teleportAddress, endpointAddress, tokenRegistryAddress, proofsAddress, participantStorageAddress);
    }

    function testVerifyAddresses() public {
        vm.prank(owner);
        deploymentProxyRegistry.setDeployment(resourceRegistryAddress, teleportAddress, endpointAddress, tokenRegistryAddress, proofsAddress, participantStorageAddress);

        Deployment memory returnedDeployment = deploymentProxyRegistry.getDeployment();

        assertEq(returnedDeployment.resourceRegistryAddress, resourceRegistryAddress);
        assertEq(returnedDeployment.teleportAddress, teleportAddress);
        assertEq(returnedDeployment.endpointAddress, endpointAddress);
        assertEq(returnedDeployment.tokenRegistryAddress, tokenRegistryAddress);
        assertEq(returnedDeployment.proofsAddress, proofsAddress);
        assertEq(returnedDeployment.participantStorageAddress, participantStorageAddress);
    }
}
