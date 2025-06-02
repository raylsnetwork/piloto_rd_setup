// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

/**
 * @title Constants
 * @dev The Constants library centralizes the management of resource IDs for the default contracts within the RaylsProtocol infrastructure. These resource IDs facilitate essential cross-chain communications across the ecosystem, streamlining interactions between various components like the Commit Chain, Privacy Ledgers, and Endpoint contracts.
 *
 * @notice Use of this library is restricted to the RaylsProtocol default contracts requiring cross-chain functionality. It provides a standardized way to reference these contracts across the ecosystem, enhancing the interoperability and efficiency of the protocol.
 */
library Constants {
    bytes32 constant RESOURCE_ID_PARTICIPANT_STORAGE =
        0x0000000000000000000000000000000000000000000000000000000000000001;
    bytes32 constant RESOURCE_ID_ENYGMA_PL_EVENTS = 0x0000000000000000000000000000000000000000000000000000000000000002;
    bytes32 constant RESOURCE_ID_TOKEN_REGISTRY = 0x0000000000000000000000000000000000000000000000000000000000000003;

    uint256 constant CHAIN_ID_ALL_PARTICIPANTS = 0;

    uint256 constant OPERATOR_CHAIN_ID = 999;
}
