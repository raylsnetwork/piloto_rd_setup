// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../rayls-protocol-sdk/tokens/RaylsErc1155Handler.sol";

contract PlaygroundErc1155 is RaylsErc1155Handler {
    address _creator;
    string _uri;
    string _name;

    constructor(
        string memory uri,
        string memory name,
        address endpoint
    )
        RaylsErc1155Handler(
            uri,
            name,
            endpoint,
            msg.sender,
            false
        )
    {
        _mint(msg.sender, 0, 100, "First Mint");
        _creator = msg.sender;
        _uri = uri;
        _name = name;
    }

    function getCreator() public view returns (address) {
        return _creator;
    }

    function getUri() public view returns (string memory) {
        return _uri;
    }

    function getName() public view returns (string memory) {
        return _name;
    }

    function getErcStandard() public pure returns (SharedObjects.ErcStandard) {
        return SharedObjects.ErcStandard.ERC1155;
    }

    function setUri(string memory uri) public {
        _uri = uri;
    }

    /**
     * @dev Mint new tokens and submit an update to the CommitChain.
     * @param to The address to which the new tokens will be minted.
     * @param id The id of the token to mint.
     * @param value The amount of tokens to mint.
     * @param data Additional data to pass to the minted token.
     */
    function mint(address to, uint256 id, uint256 value, bytes memory data) public override virtual {
        _mint(to, id, value, data);
        _submitTokenUpdate(SharedObjects.BalanceUpdateType.MINT, id, value);
    }

    /**
     * @dev Burn tokens and submit an update to the CommitChain.
     * @param from The address from which the tokens will be burned.
     * @param id The id of the token to burn.
     * @param value The amount of tokens to burn.
     */
    function burn(address from, uint256 id, uint256 value) public override virtual {
        _burn(from, id, value);
        _submitTokenUpdate(SharedObjects.BalanceUpdateType.BURN, id, value);
    }

    /**
     * @dev Internal function to submit a token balance update to the CommitChain. This function encodes a function call to the TokenRegistry contract.
     * @param updateType The type of update Mint or Burn
     * @param amount The amount of tokens to update.
     */
    function submitTokenUpdate(
        SharedObjects.BalanceUpdateType updateType, 
        uint256 id, 
        uint256 amount
    ) public override virtual {
        _submitTokenUpdate(updateType, id, amount);
    }
}
