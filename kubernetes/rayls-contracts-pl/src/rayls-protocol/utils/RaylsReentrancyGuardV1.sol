// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

abstract contract RaylsReentrancyGuardV1 is Initializable {
    // send and receive nonreentrant lock
    uint8 internal constant _NOT_ENTERED = 1;
    uint8 internal constant _ENTERED = 2;
    uint8 internal _send_entered_state;
    uint8 internal _receive_entered_state;

    function initialize() public initializer {
        //   _send_entered_state = 1;
        //  _receive_entered_state = 1;
    }

    modifier sendNonReentrant() {
        require(
            _send_entered_state == _NOT_ENTERED,
            "Rayls: no send reentrancy"
        );
        _send_entered_state = _ENTERED;
        _;
        _send_entered_state = _NOT_ENTERED;
    }
    modifier receiveNonReentrant() {
        require(
            _receive_entered_state == _NOT_ENTERED,
            "Rayls: no receive reentrancy"
        );
        _receive_entered_state = _ENTERED;
        _;
        _receive_entered_state = _NOT_ENTERED;
    }
}
