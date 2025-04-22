// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import 'forge-std/Test.sol';
import 'forge-std/console.sol';
import '../../src/commitChain/ParticipantStorage/ParticipantStorageV1.sol';

// TODO Marcos Lobo: fix all in v1
//import "../../src/commitChain/ParticipantStorage/ParticipantStorageV2.sol";

// contract ParticipantStorageTest is Test {
//     ParticipantStorageV1 public pStorage;

//     ParticipantStorageV1.ParticipantData[] public participantTestData;

//     address owner = address(2);

//     function setUp() public {
//         vm.prank(owner);
//         pStorage = new ParticipantStorageV1();

//         participantTestData.push(ParticipantStorageV1.ParticipantData({chainId: 1, role: ParticipantStorageV1.Role.PARTICIPANT, ownerId: '1', name: 'Participant 1'}));

//         participantTestData.push(ParticipantStorageV1.ParticipantData({chainId: 12, role: ParticipantStorageV1.Role.PARTICIPANT, ownerId: '2', name: 'Participant 2'}));

//         participantTestData.push(ParticipantStorageV1.ParticipantData({chainId: 123, role: ParticipantStorageV1.Role.PARTICIPANT, ownerId: '3', name: 'Participant 3'}));
//     }

//     function testVerifyParticipant() public {
//         vm.startPrank(owner);
//         ParticipantStorageV1.ParticipantData memory ParticipantData = participantTestData[0];

//         pStorage.addParticipant(ParticipantData);
//         bool isVerified = pStorage.verifyParticipant(ParticipantData.chainId);
//         assertEq(isVerified, true);

//         vm.stopPrank();
//     }

//     function testVerifyParticipantError() public {
//         vm.startPrank(owner);
//         pStorage.addParticipant(participantTestData[0]);
//         bool isVerified = pStorage.verifyParticipant(10);
//         assertEq(isVerified, false);

//         bool isVerified2 = pStorage.verifyParticipant(participantTestData[0].chainId);
//         assertEq(isVerified2, true);
//         vm.stopPrank();
//     }

//     function testGetAllParticipants() public {
//         vm.startPrank(owner);

//         pStorage.addParticipants(participantTestData);

//         ParticipantStorageV1.Participant[] memory res = pStorage.getAllParticipants();

//         for (uint256 i = 0; i < res.length; i++) {
//             ParticipantStorageV1.Participant memory participant = res[i];

//             validateParticipant(participant, participantTestData[i]);
//             assert(participant.status == ParticipantStorageV1.Status.NEW);
//         }

//         vm.stopPrank();
//     }

//     function testUpdateParticipant() public {
//         vm.startPrank(owner);

//         pStorage.addParticipant(participantTestData[0]);
//         uint256 chainId = participantTestData[0].chainId;

//         ParticipantStorageV1.Participant memory participant = pStorage.getParticipant(chainId);

//         assert(participant.createdAt == participant.updatedAt);
//         assert(participant.status == ParticipantStorageV1.Status.NEW);

//         pStorage.updateStatus(chainId, ParticipantStorageV1.Status.ACTIVE);
//         pStorage.updateRole(chainId, ParticipantStorageV1.Role.AUDITOR);

//         ParticipantStorageV1.Participant memory updatedParticipant = pStorage.getParticipant(chainId);

//         assert(updatedParticipant.status == ParticipantStorageV1.Status.ACTIVE);
//         assert(updatedParticipant.role == ParticipantStorageV1.Role.AUDITOR);

//         vm.stopPrank();
//     }

//     function testRemove() public {
//         vm.startPrank(owner);

//         pStorage.addParticipants(participantTestData);

//         assertEq(pStorage.getAllParticipants().length, participantTestData.length);

//         pStorage.removeParticipant(participantTestData[0].chainId);

//         ParticipantStorageV1.Participant memory participant1 = pStorage.getParticipant(participantTestData[0].chainId);

//         assert(participant1.status == ParticipantStorageV1.Status.INACTIVE);

//         pStorage.removeParticipant(participantTestData[1].chainId);

//         ParticipantStorageV1.Participant memory participant2 = pStorage.getParticipant(participantTestData[1].chainId);

//         assert(participant2.status == ParticipantStorageV1.Status.INACTIVE);

//         vm.stopPrank();
//     }

//     function testAddParticipants() public {
//         vm.startPrank(owner);

//         pStorage.addParticipants(participantTestData);
//         uint256[] memory res = pStorage.getAllParticipantsChainIds();

//         uint256[] memory expected = new uint256[](3);
//         expected[0] = participantTestData[0].chainId;
//         expected[1] = participantTestData[1].chainId;
//         expected[2] = participantTestData[2].chainId;

//         assertEq(res, expected);

//         vm.stopPrank();
//     }

//     function validateParticipant(ParticipantStorageV1.Participant memory participant, ParticipantStorageV1.ParticipantData memory participantData) public {
//         assertEq(participant.chainId, participantData.chainId);
//         assert(participant.role == participantData.role);
//         assertEq(participant.ownerId, participantData.ownerId);
//         assertEq(participant.name, participantData.name);

//         assert(participant.updatedAt >= participant.createdAt);
//     }
// }
