pragma solidity ^0.8.20;

// SPDX-License-Identifier: GPL-3.0

interface SharedObjects {
    /**
     * @dev Parameters required for registering a token to the VEN
     */
    struct TokenRegistrationData {
        string name;
        string symbol;
        bytes totalSupply;
        uint256 issuerChainId;
        bytes bytecode;
        bytes initializerParams;
        bool isFungible;
        ErcStandard ercStandard;
        bool isCustom;
        uint8 storageSlot;
    }

    struct ERC1155Supply {
        uint256 id;
        uint256 amount;
    }

    enum ErcStandard {
        ERC20,
        ERC404,
        ERC721,
        ERC1155,
        Enygma,
        Custom
    }

    enum BalanceUpdateType {
        BURN,
        MINT
    }

    struct EnygmaCrossTransferCallable {
        bytes32 resourceId;
        address contractAddress;
        bytes payload;
    }
}
