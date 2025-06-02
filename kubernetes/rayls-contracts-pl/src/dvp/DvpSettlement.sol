pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol"; // SPDX-License-Identifier: MIT
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title DvPSettlement
 * @dev Contract to manage any number of Delivery-versus-Payment Settlements
 */
contract RaylsDvpSettlement {
    enum SettlementStatus {
        NOT_EXISTS,
        INITIALIZED,
        EXECUTED,
        EXPIRED
    }

    enum AssetType {
        ERC20,
        ERC1155
    }

    struct Asset {
        AssetType assetType;
        address tokenAddress;
        uint256 amount;
        uint256 tokenId; // Relevant for ERC1155, can be ignored for ERC20
    }

    struct Settlement {
        address creator;
        Asset creatorAsset;
        address creatorBeneficiary;
        address counterparty;
        Asset counterpartyAsset;
        uint256 expirationDate;
        SettlementStatus status;
    }

    // stores the settlementId of the last created Settlement
    uint256 public lastSettlementId;
    // SettlementId => Settlement
    mapping(uint256 => Settlement) public settlements;

    event SettlementInitialized(
        uint256 indexed settlementId,
        Settlement settlement
    );
    event SettlementExecuted(
        uint256 indexed settlementId,
        address indexed executor
    );
    event SettlementExpired(uint256 indexed settlementId);

    /**
     * @notice Creates a new Settlement in the contract's storage and validates creator's token balance and allowance
     * @dev The creator must approve and have ballance equal or greater than the `creatorAsset.amount` in the smart contract `creatorAsset.tokenAddress`
     * @param creatorAsset asset of creator to be settled
     * @param creatorBeneficiary address of creator's ERC20 token
     *
     * @param counterparty address of counterparty OR 0x0 for open settlement
     * @param counterpartyAsset asset of counterparty to be settled
     *
     * @param expirationDate unix timestamp in seconds
     */
    function createSettlement(
        Asset memory creatorAsset,
        address creatorBeneficiary,
        address counterparty,
        Asset memory counterpartyAsset,
        uint256 expirationDate
    ) external {
        require(
            expirationDate > block.timestamp,
            "DvPSettlement.createSettlement: INVALID_EXPIRATION_DATE"
        );
        require(
            lastSettlementId < type(uint256).max,
            "DvPSettlement.createSettlement: INVALID_SETTLEMENT_ID"
        );

        lastSettlementId++;

        Settlement storage settlement = settlements[lastSettlementId];
        settlement.creator = msg.sender;
        settlement.creatorAsset = creatorAsset;
        settlement.creatorBeneficiary = creatorBeneficiary;
        settlement.counterparty = counterparty;
        settlement.counterpartyAsset = counterpartyAsset;
        settlement.expirationDate = expirationDate;
        settlement.status = SettlementStatus.INITIALIZED;

        // Check allowance and balance
        if (creatorAsset.assetType == AssetType.ERC20) {
            require(
                IERC20(creatorAsset.tokenAddress).allowance(
                    settlement.creator,
                    address(this)
                ) >= creatorAsset.amount,
                "DvPSettlement.createSettlement: INSUFFICIENT_ALLOWANCE"
            );

            require(
                IERC20(creatorAsset.tokenAddress).balanceOf(
                    settlement.creator
                ) >= creatorAsset.amount,
                "DvPSettlement.createSettlement: INSUFFICIENT_BALANCE"
            );
        } else if (creatorAsset.assetType == AssetType.ERC1155) {
            require(
                IERC1155(creatorAsset.tokenAddress).isApprovedForAll(
                    settlement.creator,
                    address(this)
                ),
                "DvPSettlement.createSettlement: NOT_APPROVED_FOR_ALL"
            );

            require(
                IERC1155(creatorAsset.tokenAddress).balanceOf(
                    settlement.creator,
                    creatorAsset.tokenId
                ) >= creatorAsset.amount,
                "DvPSettlement.createSettlement: INSUFFICIENT_BALANCE"
            );
        } else {
            revert("DvPSettlement.createSettlement: INVALID_ASSET_TYPE");
        }

        emit SettlementInitialized(lastSettlementId, settlement);
    }

    /**
     * @notice Executes an existing Settlement with the sender as the counterparty
     * @dev This function can only be successfully called by the designated counterparty unless
     * the counterparty address is empty (0x0) in which case anyone can fulfill and execute the settlement
     * @dev The counterparty must approve and have ballance equal or greater than the `counterpartyAsset.amount` in the smart contract `counterpartyAsset.tokenAddress`
     * @param settlementId Id of the Settlement to execute
     */
    function executeSettlement(uint256 settlementId) external {
        Settlement storage settlement = settlements[settlementId];

        require(
            settlement.status == SettlementStatus.INITIALIZED,
            "DvPSettlement.executeSettlement: SETTLEMENT_NOT_INITIALIZED"
        );
        require(
            settlement.expirationDate > block.timestamp,
            "DvPSettlement.executeSettlement: SETTLEMENT_EXPIRED"
        );
        require(
            // if empty (0x0) counterparty address, consider it an "open" settlement
            settlement.counterparty == address(0) ||
                settlement.counterparty == msg.sender,
            "DvPSettlement.executeSettlement: UNAUTHORIZED_SENDER"
        );

        // if empty (0x0) creatorBeneficiary address, send funds to creator
        address creatorReceiver = (settlement.creatorBeneficiary == address(0))
            ? settlement.creator
            : settlement.creatorBeneficiary;

        // if empty (0x0) counterpartyReceiver address, send funds to msg.sender
        address counterpartyReceiver = (settlement.counterparty == address(0))
            ? msg.sender
            : settlement.counterparty;

        settlement.status = SettlementStatus.EXECUTED;

        // Transfer Creator Asset to Counterparty Receiver
        if (settlement.creatorAsset.assetType == AssetType.ERC20) {
            _erc20TransferFrom(
                settlement.creatorAsset.tokenAddress,
                settlement.creator,
                counterpartyReceiver,
                settlement.creatorAsset.amount
            );
        } else if (settlement.creatorAsset.assetType == AssetType.ERC1155) {
            _erc1155TransferFrom(
                settlement.creatorAsset.tokenAddress,
                settlement.creator,
                counterpartyReceiver,
                settlement.creatorAsset.tokenId,
                settlement.creatorAsset.amount
            );
        } else {
            revert(
                "DvPSettlement.executeSettlement: INVALID_ASSET_TYPE for creator"
            );
        }

        // Transfer Counterparty Asset to Creator Receiver
        if (settlement.counterpartyAsset.assetType == AssetType.ERC20) {
            _erc20TransferFrom(
                settlement.counterpartyAsset.tokenAddress,
                counterpartyReceiver,
                creatorReceiver,
                settlement.counterpartyAsset.amount
            );
        } else if (
            settlement.counterpartyAsset.assetType == AssetType.ERC1155
        ) {
            _erc1155TransferFrom(
                settlement.counterpartyAsset.tokenAddress,
                counterpartyReceiver,
                creatorReceiver,
                settlement.counterpartyAsset.tokenId,
                settlement.counterpartyAsset.amount
            );
        } else {
            revert(
                "DvPSettlement.executeSettlement: INVALID_ASSET_TYPE for counterparty"
            );
        }

        emit SettlementExecuted(settlementId, counterpartyReceiver);
    }

    function _erc20TransferFrom(
        address tokenAddress,
        address from,
        address to,
        uint256 amount
    ) internal {
        require(
            IERC20(tokenAddress).transferFrom(from, to, amount),
            "DvPSettlement.executeSettlement: TRANSFER_FAILED"
        );
    }

    function _erc1155TransferFrom(
        address tokenAddress,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) internal {
        IERC1155(tokenAddress).safeTransferFrom(from, to, tokenId, amount, "");
    }

    /**
     * @notice When called after a given settlement expires, it refunds tokens to the creator
     * @dev This function can be called by anyone since there is no other possible outcome for
     * a created settlement that has passed the expiration date
     * @param settlementId Id of the Settlement to expire
     */
    function expireSettlement(uint256 settlementId) external {
        Settlement storage settlement = settlements[settlementId];

        require(
            settlement.status == SettlementStatus.INITIALIZED,
            "DvPSettlement.expireSettlement: SETTLEMENT_NOT_INITIALIZED"
        );
        require(
            settlement.expirationDate < block.timestamp,
            "DvPSettlement.expireSettlement: SETTLEMENT_NOT_YET_EXPIRED"
        );

        settlement.status = SettlementStatus.EXPIRED;
        emit SettlementExpired(settlementId);
    }
}
