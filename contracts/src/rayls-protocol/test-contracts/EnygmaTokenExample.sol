// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '../../rayls-protocol-sdk/tokens/RaylsEnygmaHandler.sol';

contract EnygmaTokenExample is RaylsEnygmaHandler {
    string public message = 'test';
    constructor(string memory _name, string memory _symbol, address _endpoint) RaylsEnygmaHandler(_name, _symbol, _endpoint, msg.sender, 18, false) {}

    function receiveMsgA(string memory _msg) public {
        message = _msg;
    }
}
