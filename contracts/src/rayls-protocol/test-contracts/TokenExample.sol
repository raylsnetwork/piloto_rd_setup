// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../rayls-protocol-sdk/tokens/RaylsErc20Handler.sol";

contract TokenExample is RaylsErc20Handler {
    address public constant addressToFail =  address(0x0000000000000000000555000000000000001123);
    constructor(
        string memory _name,
        string memory _symbol,
        address _endpoint
    )
        RaylsErc20Handler(
            _name,
            _symbol,
            _endpoint,
            msg.sender,
            false
        )
    {
        _mint(msg.sender, 2000000 * 10 ** 18);
    }

    function receiveTeleportAtomic(address to, uint256 value) public override receiveMethod {
        if(to == addressToFail) revert("Destination address is the one that revert messages."); // created for test purposes

        super.receiveTeleportAtomic(to, value);
    }
}
