// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
import '../../commitChain/ParticipantStorage/ParticipantStorageV1.sol';

interface IParticipantValidator {
    /**
     * @dev External function to validate both message participants
     * @param originChainId ChainId of the message origin participant
     * @param destinationChainId ChainId of the message destination participant
     */
    function validateMessageParticipants(uint256 originChainId, uint256 destinationChainId) external;

    function getAllParticipants() external view returns (ParticipantStorageV1.Participant[] memory);
}
