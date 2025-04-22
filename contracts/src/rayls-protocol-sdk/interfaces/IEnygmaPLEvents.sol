//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../libraries/SharedObjects.sol';

struct CCTransfer {
    bytes32 resourceId;
    uint256[] value;
    uint256[] toChainId;
    address[] to;
    SharedObjects.EnygmaCrossTransferCallable[][] callables;
    address from;
    bytes32 referenceId;
}

interface IEnygmaPLEvents {
    function mint(bytes32 _resourceId, uint256 _amount) external;

    function burn(bytes32 _resourceId, uint256 _amount) external;

    function creation(bytes32 _resourceId) external;

    function transferToCC(CCTransfer memory _ccTransfer) external;

    function transferToPL(bytes32 _resourceId, uint256 _value, address _to) external;

    function revertMint(bytes32 _resourceId, uint256 _amount, address _to, string memory _reason) external;
}
