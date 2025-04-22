// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library Utils {
    function addressToBytes32(address a) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(a) << 96));
    }

    // Enum representing the possible statuses of a message
    enum MessageStatus {
        Pending,
        Executed,
        Rejected,
        Reverted
    }
}
