// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

contract TokenLocker {
    mapping(address => mapping(address => uint256)) private lockedToken;
    mapping(address => mapping(address => mapping(uint256 => uint256))) private lockedMultitoken;

    //ERC-20
    function _lock(address token, address to, uint256 amount) internal {
        require(amount > 0, "Amount must be greater than 0");
        require(to != address(0));

        lockedToken[token][to] += amount;
    }

    function _unlock(address token, address to, uint256 amount) internal returns (bool) {
        require(to != address(0));

        uint256 amountToUnlock = lockedToken[token][to];
        require(amount > 0 && amount <= amountToUnlock, "Not enough funds to unlock");

        lockedToken[token][to] -= amount;

        return true;
    }

    function _getLockedAmount(address token, address to) internal view returns (uint256) {
        return lockedToken[token][to];
    }

    //ERC-1155
    function _lock(uint256 id, address token, address to, uint256 amount) internal {
        require(amount > 0, "Amount must be greater than 0");
        require(to != address(0));

        lockedMultitoken[token][to][id] += amount;
    }

    function _unlock(uint256 id, address token, address to, uint256 amount) internal returns (bool) {
        require(to != address(0));

        uint256 amountToUnlock = lockedMultitoken[token][to][id];
        require(amount > 0 && amount <= amountToUnlock, "Not enough funds to unlock");

        lockedMultitoken[token][to][id] -= amount;

        return true;
    }

    function _getLockedAmount(uint256 id, address token, address to) internal view returns (uint256) {
        return lockedMultitoken[token][to][id];
    }
}
