// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library Signatures {
    string constant receiveTransferRequest = "receiveTransferRequest(address,uint256)";
    string constant receiveTransferBondRequest = "receiveTransferRequest(address,uint256,uint256,string,bytes)";
    string constant receiveIssuanceRequest = "receiveIssuanceRequest(uint256,address,address,uint256)";
    string constant receiveIssuanceBondRequest = "receiveIssuanceRequest(uint256,address,address,uint256,uint256)";
    string constant unlock = "unlock(address,uint256)";
    string constant unlockBond = "unlock(uint256,address,uint256)";
    string constant commitBalance = "commitBalance(uint256,address,bytes32,uint256,uint256)";
}
