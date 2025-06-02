// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import 'forge-std/Test.sol';
import 'forge-std/Vm.sol';
import '../src/MessageExecutor.sol';
// import '../src/commitChain/Teleport/TeleportV1.sol';

// contract MessageExecutorTest is Test {
//     MessageExecutor public executor;
//     TeleportV1 public teleport;

//     address owner = address(2);

//     function setUp() public {
//         vm.prank(owner);
//         executor = new MessageExecutor();
//         teleport = new TeleportV1();
//     }

//     function test_Revert_executeMessage() public {
//         vm.expectRevert(bytes('executeMessage called from unauthorized account'));
//         executor.executeMessage(address(1), bytes(''), bytes32(0), 0, address(1));
//     }

//     function test_Revert_internal_executeMessage() public {
//         //checks the internal executeMessage function
//         bytes32 messageId = bytes32(0);
//         address notContract = address(1);

//         // check if it reverts when to is not a contract
//         vm.expectRevert(bytes('No contract at target address'));
//         vm.startPrank(owner);
//         executor.executeMessage(notContract, bytes(''), messageId, 1, address(1));

//         // check if it reverts when the low level call is not successful
//         vm.expectRevert(abi.encodeWithSelector(MessageExecutor.MessageFailure.selector, messageId, bytes('')));
//         executor.executeMessage(address(teleport), bytes(''), messageId, 1, address(1));
//         vm.stopPrank();
//     }
// }
