//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EnygmaCCEvents  {
    
    event EnygmaTransfer(bytes32 resourceId, uint256 value, uint256 toChainId, address to);

    function transfer(bytes32 _resourceId, uint256 _value, uint256 _toChainId, address _to) public {
        emit EnygmaTransfer(_resourceId, _value, _toChainId, _to);
    }
}
