// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../rayls-protocol-sdk/tokens/RaylsErc721Handler.sol";

contract PlaygroundErc721 is RaylsErc721Handler {
    address _creator;
    string _uri;
    string _name;
    string _symbol;

    constructor(
        string memory uri,
        string memory name,
        string memory symbol,
        address endpoint
    )
        RaylsErc721Handler(
            uri,
            name,
            symbol,
            endpoint,
            msg.sender,
            false
        )
    {
        _creator = msg.sender;
        _uri = uri;
        _name = name;
        _symbol = symbol;
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

    function getSymbol() public view returns (string memory) {
        return _symbol;
    }

    function getErcStandard() public pure returns (SharedObjects.ErcStandard) {
        return SharedObjects.ErcStandard.ERC721;
    }

    function setUri(string memory uri) public {
        _uri = uri;
    }

    /**
     * @dev Mint new tokens and submit an update to the CommitChain.
     * @param to The address to which the new tokens will be minted.
     * @param id The id of the token to mint.
     */
    function mint(address to, uint256 id) public override virtual {
        _mint(to, id);
        _submitTokenUpdate(SharedObjects.BalanceUpdateType.MINT, id);
    }

    /**
     * @dev Burn tokens and submit an update to the CommitChain.
     * @param id The id of the token to burn.
     */
    function burn(uint256 id) public override virtual {
        _burn(id);
        _submitTokenUpdate(SharedObjects.BalanceUpdateType.BURN, id);
    }

    /**
     * @dev Internal function to submit a token balance update to the CommitChain. This function encodes a function call to the TokenRegistry contract.
     * @param updateType The type of update Mint or Burn
     * @param tokenId The amount of tokens to update.
     */
    function submitTokenUpdate(
        SharedObjects.BalanceUpdateType updateType, 
        uint256 tokenId
    ) public override virtual {
        _submitTokenUpdate(updateType, tokenId);
    }
}
