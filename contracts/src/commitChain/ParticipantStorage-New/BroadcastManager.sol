
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StorageBase.sol"; // Certifique-se de que o caminho está correto

contract BroadcastManager is StorageBase {
    event ParticipantsBroadcasted(Participant[] participants);
    event EnygmaBroadcasted(PrivateLedgerDataEnygma[] enygmaData);

    function broadcastParticipants() external returns (Participant[] memory) {
        Participant[] memory allParticipants = new Participant[](registeredChainIds.length);
        for (uint256 i = 0; i < registeredChainIds.length; i++) {
            allParticipants[i] = participants[registeredChainIds[i]];
        }
        emit ParticipantsBroadcasted(allParticipants);
        return allParticipants;
    }

    function broadcastEnygmaData() external returns (PrivateLedgerDataEnygma[] memory) {
        PrivateLedgerDataEnygma[] memory allEnygma = new PrivateLedgerDataEnygma[](allEnygmaParticipants.length);
        for (uint256 i = 0; i < allEnygmaParticipants.length; i++) {
            allEnygma[i] = enygmaData[allEnygmaParticipants[i]];
        }
        emit EnygmaBroadcasted(allEnygma);
        return allEnygma;
    }
}