// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import 'forge-std/Test.sol';
import 'forge-std/Vm.sol';
import {Upgrades} from 'openzeppelin-foundry-upgrades/Upgrades.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
// import '../src/commitChain/ParticipantStorage/ParticipantStorageV1.sol';
// import '../src/commitChain/TokenRegistry/TokenRegistryV1.sol';
// import '../src/commitChain/ResourceRegistry/ResourceRegistryV1.sol';

contract TokenRegistryTest is Test {
    // address owner = address(30035);
    // address participantStorageAt = address(69420);
    // TokenRegistry instance;
    // TokenRegistry.TokenRegistrationData dummyTokenData =
    //     TokenRegistry.TokenRegistrationData(
    //         "TestToken",
    //         "TT",
    //         1,
    //         bytes32(0x0),
    //         true,
    //         ResourceRegistry.ErcStandard.ERC20,
    //         TokenRegistry.TokenType.CASH
    //     );
    // function setUp() public {
    //     vm.startPrank(owner);
    //     address transparentPoxy = Upgrades.deployTransparentProxy(
    //         "TokenRegistry.sol",
    //         owner,
    //         abi.encodeCall(
    //             TokenRegistry.initialize,
    //             (owner, participantStorageAt, address(222))
    //         )
    //     );
    //     instance = TokenRegistry(transparentPoxy);
    //     __mockIssuerParticipant(true);
    // }
    // function testAddToken() public {
    //     instance.addToken(dummyTokenData);
    //     __assertDummyTokenAdded();
    // }
    // function testAddTokenDuplicateName() public {
    //     instance.addToken(dummyTokenData);
    //     vm.expectRevert(TokenRegistry.TokenNameDuplicate.selector);
    //     instance.addToken(dummyTokenData);
    // }
    // function testAddTokenNonIssuer() public {
    //     vm.clearMockedCalls();
    //     __mockIssuerParticipant(false);
    //     vm.expectRevert(TokenRegistry.UnauthorizedParticipant.selector);
    //     instance.addToken(dummyTokenData);
    // }
    // function testAddTokenUnauthorized() public {
    //     vm.stopPrank();
    //     vm.expectRevert(
    //         abi.encodeWithSelector(
    //             OwnableUpgradeable.OwnableUnauthorizedAccount.selector,
    //             address(this)
    //         )
    //     );
    //     instance.addToken(dummyTokenData);
    // }
    // function testUpdateStatus() public {
    //     instance.addToken(dummyTokenData);
    //     TokenRegistry.TokenStatus newStatus = TokenRegistry
    //         .TokenStatus
    //         .INACTIVE;
    //     instance.updateStatus(bytes32(bytes(dummyTokenData.name)), newStatus);
    //     TokenRegistry.Token memory token = instance.getAllTokens()[0];
    //     assertTrue(
    //         token.status == newStatus,
    //         "Token status should have been updated to REJECTED"
    //     );
    // }
    // function testUpdateStatusSameStatus() public {
    //     instance.addToken(dummyTokenData);
    //     vm.expectRevert(TokenRegistry.TokenStatusAlreadySet.selector);
    //     instance.updateStatus(
    //         bytes32(bytes(dummyTokenData.name)),
    //         TokenRegistry.TokenStatus.NEW
    //     );
    // }
    // function testUpdateStatusTokenNotFound() public {
    //     vm.expectRevert(TokenRegistry.TokenNotFound.selector);
    //     instance.updateStatus(
    //         bytes32(bytes(dummyTokenData.name)),
    //         TokenRegistry.TokenStatus.ACTIVE
    //     );
    // }
    // function testUpdateStatusUnauthorized() public {
    //     instance.addToken(dummyTokenData);
    //     vm.stopPrank();
    //     vm.expectRevert(
    //         abi.encodeWithSelector(
    //             OwnableUpgradeable.OwnableUnauthorizedAccount.selector,
    //             address(this)
    //         )
    //     );
    //     instance.updateStatus(
    //         bytes32(bytes(dummyTokenData.name)),
    //         TokenRegistry.TokenStatus.ACTIVE
    //     );
    // }
    // function __assertDummyTokenAdded() private {
    //     TokenRegistry.Token[] memory tokens = instance.getAllTokens();
    //     assertTrue(tokens.length == 1, "Should have 1 token registered");
    //     assertTrue(
    //         keccak256(abi.encode(tokens[0].name)) ==
    //             keccak256(abi.encode(dummyTokenData.name)),
    //         "Token name should match"
    //     );
    //     assertTrue(
    //         keccak256(abi.encode(tokens[0].symbol)) ==
    //             keccak256(abi.encode(dummyTokenData.symbol)),
    //         "Token symbol should match"
    //     );
    //     assertTrue(
    //         tokens[0].issuerChainId == dummyTokenData.issuerChainId,
    //         "Token chainId should match"
    //     );
    //     assertTrue(
    //         tokens[0].status == TokenRegistry.TokenStatus.NEW,
    //         "Token status should be NEW"
    //     );
    // }
    // function __mockIssuerParticipant(bool result) private {
    //     ParticipantStorage.Participant memory participant = ParticipantStorage
    //         .Participant({
    //             chainId: dummyTokenData.issuerChainId,
    //             status: ParticipantStorage.Status.NEW,
    //             name: "TestParticipant",
    //             ownerId: "TestParticipantId",
    //             createdAt: block.timestamp,
    //             updatedAt: block.timestamp,
    //             role: result
    //                 ? ParticipantStorage.Role.ISSUER
    //                 : ParticipantStorage.Role.PARTICIPANT
    //         });
    //     vm.mockCall(
    //         address(participantStorageAt),
    //         abi.encodeWithSelector(
    //             ParticipantStorage.getParticipant.selector,
    //             dummyTokenData.issuerChainId
    //         ),
    //         abi.encode(participant)
    //     );
    // }
}
