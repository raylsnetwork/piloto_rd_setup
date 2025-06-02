// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract SimpleErc20 is ERC20 {
    constructor(
    )
        ERC20(
            "FOO",
            "FOO"
        )
    {
        _mint(msg.sender, 2000);
    }
}
