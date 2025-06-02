// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

import './EnygmaVerifierk6.sol';

contract EnygmaVerifierk6Proxy {
    address verifierAddress;
    address owner;

    constructor(address _verifierAddress) {
        verifierAddress = _verifierAddress;
        owner = msg.sender;
    }

    function verifyProof(uint[2] calldata _pA, uint[2][2] calldata _pB, uint[2] calldata _pC, uint[32] calldata _pubSignals) public view returns (bool) {
        return EnygmaVerifierk6(verifierAddress).verifyProof(_pA, _pB, _pC, _pubSignals);
    }

    function setVerifierAddress(address _verifierAddress) public checkOwner {
        verifierAddress = _verifierAddress;
    }

    modifier checkOwner() {
        require(msg.sender == owner, 'Only admin can do this action');
        _;
    }
}
