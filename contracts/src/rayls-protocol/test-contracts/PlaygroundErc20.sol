// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../rayls-protocol-sdk/tokens/RaylsErc20Handler.sol";

contract PlaygroundErc20 is RaylsErc20Handler {
    address _creator;
    string _name;
    string _symbol;

    constructor(
        string memory name,
        string memory symbol,
        address endpoint
    )
        RaylsErc20Handler(
            name,
            symbol,
            endpoint,
            msg.sender,
            false
        )
    {
        _mint(msg.sender, 1000);
        _creator = msg.sender;
        _name = name;
        _symbol = symbol;
    }

    function getCreator() public view returns (address) {
        return _creator;
    }

    function getName() public view returns (string memory) {
        return _name;
    }

    function getSymbol() public view returns (string memory) {
        return _symbol;
    }

    function getErcStandard() public pure returns (SharedObjects.ErcStandard) {
        return SharedObjects.ErcStandard.ERC20;
    }

    /**
     * @dev Mint new tokens and submit an update to the CommitChain.
     * @param to The address to which the new tokens will be minted.
     * @param value The amount of tokens to mint.
     */
    function mint(address to, uint256 value) public override virtual {
        _mint(to, value);
        _submitTokenUpdate(SharedObjects.BalanceUpdateType.MINT, value);
    }

    /**
     * @dev Burn tokens and submit an update to the CommitChain.
     * @param from The address from which the tokens will be burned.
     * @param value The amount of tokens to burn.
     */
    function burn(address from, uint256 value) public override virtual {
        _burn(from, value);
        _submitTokenUpdate(SharedObjects.BalanceUpdateType.BURN, value);
    }

    /**
     * @dev Submit a token balance update to the CommitChain.
     * @param updateType The type of update Mint or Burn
     * @param amount The amount of tokens to update.
     */
    function submitTokenUpdate(SharedObjects.BalanceUpdateType updateType, uint256 amount) public override virtual {
        _submitTokenUpdate(updateType, amount);
    }
}
