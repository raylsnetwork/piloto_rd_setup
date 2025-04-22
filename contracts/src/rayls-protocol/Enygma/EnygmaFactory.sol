// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import './EnygmaV1.sol';

contract EnygmaFactory {
    mapping(bytes32 => address) public resourceIdToEnygma;
    event Created(address newContractAddress);

    function createEnygma(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        bytes32 _resourceId,
        address _owner,
        uint256 _onwerChainId,
        address _participantStorageAddress,
        address _endpoint,
        address _tokenRegistry
    ) public {
        EnygmaV1 enygma = new EnygmaV1(_name, _symbol, _decimals, _owner, _participantStorageAddress, _endpoint, _tokenRegistry, _resourceId,  _onwerChainId);
        emit Created(address(enygma));
        resourceIdToEnygma[_resourceId] = address(enygma);
    }

    function getEnygmaAddress(bytes32 _resourceId) public view returns (address) {
        return resourceIdToEnygma[_resourceId];
    }

    // function setEnygmaCCEventsAddress(address _enygmaCCEventsAddress) public {
    //     enygmaCCEventsAddress = _enygmaCCEventsAddress;
    // }
}
