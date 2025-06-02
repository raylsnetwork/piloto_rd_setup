// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

interface ITokenRegistryValidator {
    /**
     * @dev External function to validate if a token is frozen for a certain participant
     * @param resourceId ResourceIf of the related token
     * @param participantsChainId ChainId of the participant to freeze
     */
    function validateTokenForParticipant(bytes32 resourceId, uint256 participantsChainId) external;
}
