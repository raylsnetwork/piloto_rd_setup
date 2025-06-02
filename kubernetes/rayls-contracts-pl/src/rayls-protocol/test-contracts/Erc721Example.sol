// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../rayls-protocol-sdk/tokens/RaylsErc721Handler.sol";

contract RaylsErc721Example is RaylsErc721Handler {
    uint256 private _tokenIdCounter;
    string private _baseUri;

    constructor(string memory baseUri, string memory name, string memory symbol, address _endpoint)
        RaylsErc721Handler(baseUri, name, symbol, _endpoint, msg.sender, false)
    {
        _safeMint(msg.sender, 0);
        _safeMint(msg.sender, 100);
        _safeMint(msg.sender, 150);

        _baseUri = baseUri;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseUri;
    }

    function awardItem(address account) public returns (uint256) {
        uint256 newItemId = _tokenIdCounter;
        _mint(account, newItemId);

        _tokenIdCounter++;

        return newItemId;
    }
}
