// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import '../interfaces/IEnygmaV1.sol';
import '../interfaces/IEnygmaVerifierk2.sol';
import '../interfaces/IEnygmaVerifierk6.sol';
import '../../commitChain/ParticipantStorage/ParticipantStorageV1.sol';
import '../../commitChain/TokenRegistry/TokenRegistryV1.sol';
import '../interfaces/IEnygmaCCEvents.sol';
import '../../rayls-protocol-sdk/RaylsApp.sol';
import './EnygmaPLEvents.sol';

contract EnygmaV1 is IEnygmaV1, RaylsApp {
    string private name;
    string private symbol;
    uint8 private decimals;
    uint256 public totalSupplyX = 0;
    uint256 public totalSupplyY = 0;
    uint256 public totalSupply;

    address owner;
    uint256 public ownerChainId;
    uint256 public lastblockNum;
    uint256 public lastblockNumPending;
    address public participantStorageContract;
    address public tokenRegistryContract;

    mapping(uint256 => mapping(uint256 => EnygmaPointWithChainId)) public referenceBalance;
    mapping(uint256 => address) public verifiers;
    PendingTransaction[] public pendingTransactions;
    PendingMintOrBurn[] public pendingMintsAndBurns;
    mapping(uint256 => bool) public pendingBalancesTallied;
    mapping(uint256 => uint256) public lastblockNumAtCurrentBlockNumber;

    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address _owner,
        address _participantStorageContract,
        address _endpoint,
        address _tokenRegistryContract,
        bytes32 _resourceId,
        uint256 _onwerChainId
    ) RaylsApp(_endpoint) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        lastblockNum = block.number;
        lastblockNumPending = lastblockNum;
        owner = _owner;
        totalSupply = 0;
        participantStorageContract = _participantStorageContract;

        totalSupplyX = 0;
        totalSupplyY = 1;

        tokenRegistryContract = _tokenRegistryContract;
        resourceId = _resourceId;
        ownerChainId = _onwerChainId;
    }

    modifier onlyIssuer() {
        ParticipantStorageV1 participantStorage = ParticipantStorageV1(participantStorageContract);
        bool isAllowed = participantStorage.checkEnygmaIssuerAccountAllowed(msg.sender, ownerChainId);

        require(isAllowed, 'Only Issuer Accounts may perform those actions.');
        _;
    }

    modifier onlyAllowed() {
        ParticipantStorageV1 participantStorage = ParticipantStorageV1(participantStorageContract);
        bool isAllowed = participantStorage.checkEnygmaAccountAllowed(msg.sender);

        require(isAllowed, 'Only registered accounts can transact');
        _;
    }

    modifier checkFreeze() {
        TokenRegistryV1 tokenRegistry = TokenRegistryV1(tokenRegistryContract);
        bool isFrozen = tokenRegistry.tokenEnygmaIsFreeze(resourceId);

        require(!isFrozen, 'Token is in freeze status');
        _;
    }

    function isNullifierUnique(uint256 nullifier) public view returns (bool) {
        for (uint256 i = 0; i < pendingTransactions.length; i++) {
            if (pendingTransactions[i].nullifier == nullifier) {
                return false;
            }
        }
        return true;
    }

    bool private processing;
    modifier nonReentrant() {
        //require(!processing, 'Reentrancy detected');
        processing = true;
        _;
        processing = false;
    }

    function updateBalances(uint256 chainIdToUpdate, uint256 amtX, uint256 amtY, uint256 blockNumber, bool isGlobalUpdate) internal {
        if (isGlobalUpdate) {
            // Global update for all participants
            ParticipantStorageV1 participantStorage = ParticipantStorageV1(participantStorageContract);
            uint256[] memory enygmaParticipants = participantStorage.getEnygmaAllParticipantsChainIds();

            for (uint256 i = 0; i < enygmaParticipants.length; i++) {
                uint256 currentChainId = enygmaParticipants[i];
                ensureBalanceInitialized(currentChainId);

                if (currentChainId != chainIdToUpdate) {
                    referenceBalance[blockNumber][currentChainId].c1 = referenceBalance[lastblockNum][currentChainId].c1;
                    referenceBalance[blockNumber][currentChainId].c2 = referenceBalance[lastblockNum][currentChainId].c2;
                } else {
                    (uint256 xUpdated, uint256 yUpdated) = CurveBabyJubJub.pointAdd(referenceBalance[lastblockNum][currentChainId].c1, referenceBalance[lastblockNum][currentChainId].c2, amtX, amtY);
                    referenceBalance[blockNumber][currentChainId].c1 = xUpdated;
                    referenceBalance[blockNumber][currentChainId].c2 = yUpdated;
                }
            }
        } else {
            ensureBalanceInitialized(chainIdToUpdate);
            // Specific update for one participant
            (referenceBalance[blockNumber][chainIdToUpdate].c1, referenceBalance[blockNumber][chainIdToUpdate].c2) = CurveBabyJubJub.pointAdd(
                referenceBalance[blockNumber][chainIdToUpdate].c1,
                referenceBalance[blockNumber][chainIdToUpdate].c2,
                amtX,
                amtY
            );
        }
    }

    function mintSupply(uint256 _amount, uint256 toChainId, uint256 _blockNumber) public onlyIssuer nonReentrant returns (bool) {
        (uint256 amtX, uint256 amtY) = derivePk(_amount);

        if (totalSupply == 0) {
            (totalSupplyX, totalSupplyY) = CurveBabyJubJub.pointAdd(totalSupplyX, totalSupplyY, amtX, amtY);
            totalSupply += _amount;

            updateBalances(toChainId, amtX, amtY, _blockNumber, true); // Global update for all participants
            lastblockNum = _blockNumber;
            lastblockNumPending = _blockNumber;
            pendingBalancesTallied[lastblockNumPending] = true;
            emit SupplyMinted(lastblockNum, _amount, toChainId);
        } else {
            uint256 currentBlockNumber = uint256(_blockNumber);

            finalisePendingTransactions(currentBlockNumber);

            // Add to pending mints and burns
            pendingMintsAndBurns.push(
                PendingMintOrBurn({
                    pointToAddToBalance: EnygmaPointWithChainId({c1: amtX, c2: amtY, chainId: toChainId}),
                    amount: _amount,
                    blockNumber: _blockNumber,
                    transactionType: 1 // Mint transaction
                })
            );
            lastblockNumPending = currentBlockNumber;
            updateBalances(toChainId, amtX, amtY, lastblockNumPending, false); // Specific update for one participant
        }

        return true;
    }

    function burn(uint256 _chainId, uint256 burnValue, uint256 _blockNumber) public onlyIssuer nonReentrant returns (bool) {
        require(burnValue <= CurveBabyJubJub.P, 'Error: burnValue > Q');
        (uint256 commX, uint256 commY) = pedCom(CurveBabyJubJub.P - burnValue, 0);

        uint256 currentBlockNumber = uint256(_blockNumber);

        finalisePendingTransactions(currentBlockNumber);

        // Add to pending mints and burns
        pendingMintsAndBurns.push(
            PendingMintOrBurn({
                pointToAddToBalance: EnygmaPointWithChainId({c1: commX, c2: commY, chainId: _chainId}),
                amount: burnValue,
                blockNumber: _blockNumber,
                transactionType: 2 // Burn transaction
            })
        );
        lastblockNumPending = currentBlockNumber;

        updateBalances(_chainId, commX, commY, lastblockNumPending, false); // Specific update for one participant

        return true;
    }

    // Transfers funds from one account to another by adding the Pedersen commitments
    // and checking the proof and input of the account
    function transfer(uint8 k, Point[] memory commitments, Proof memory proof, uint256[] memory chainIds, bytes[] memory encryptedMessages) public checkFreeze nonReentrant returns (bool) {
        uint256 currentBlockNumber = uint256(proof.public_signal[4 * k + 1]);
        uint256 nullifier = uint256(proof.public_signal[4 * k]);
        validateTransferInputs(k, commitments, proof, chainIds, nullifier, currentBlockNumber);
        verifyProof(k, proof);
        finalisePendingTransactions(currentBlockNumber);
        // Add the current transaction to pending balances
        addPendingTransaction(k, commitments, proof, chainIds, nullifier, lastblockNumAtCurrentBlockNumber[currentBlockNumber], currentBlockNumber);

        finalizeTransfer(chainIds, encryptedMessages);
        lastblockNumPending = currentBlockNumber;

        emit TransactionSuccessful(msg.sender);
        return true;
    }

    function finalisePendingTransactions(uint256 currentBlockNumber) internal {
        // Initialize block state if not already set
        if (lastblockNumAtCurrentBlockNumber[currentBlockNumber] == 0) {
            lastblockNumAtCurrentBlockNumber[currentBlockNumber] = lastblockNum;
            copyReferenceBalancesFromBlockNumberSourceToBlockNumberNew(currentBlockNumber, lastblockNumPending);
        }

        // Process pending actions if currentBlockNumber > lastblockNum
        if (currentBlockNumber > lastblockNum && (pendingTransactions.length > 0 || pendingMintsAndBurns.length > 0) && currentBlockNumber != lastblockNumPending) {
            processPendingActions(lastblockNumPending);
            lastblockNum = lastblockNumPending;
            pendingBalancesTallied[lastblockNumPending] = true;
            emit BalancesFinalised(lastblockNum);
        }
    }

    function copyReferenceBalancesFromBlockNumberSourceToBlockNumberNew(uint256 blockNumberNew, uint256 blockNumberSource) internal {
        ParticipantStorageV1 participantStorage = ParticipantStorageV1(participantStorageContract);
        uint256[] memory enygmaParticipants = participantStorage.getEnygmaAllParticipantsChainIds();
        for (uint256 i = 0; i < enygmaParticipants.length; i++) {
            uint256 currentChainId = enygmaParticipants[i];

            ensureBalanceInitialized(currentChainId);

            referenceBalance[blockNumberNew][currentChainId].c1 = referenceBalance[blockNumberSource][currentChainId].c1;
            referenceBalance[blockNumberNew][currentChainId].c2 = referenceBalance[blockNumberSource][currentChainId].c2;
        }
    }

    function processPendingActions(uint256 blockNumber) internal {
        delete pendingTransactions;

        uint256[] memory indicesToDelete = new uint256[](pendingMintsAndBurns.length);
        uint256 deleteCount = 0;

        for (uint256 i = 0; i < pendingMintsAndBurns.length; i++) {
            PendingMintOrBurn memory pending = pendingMintsAndBurns[i];

            if (pending.blockNumber <= blockNumber) {
                (totalSupplyX, totalSupplyY) = CurveBabyJubJub.pointAdd(totalSupplyX, totalSupplyY, pending.pointToAddToBalance.c1, pending.pointToAddToBalance.c2);
                if (pending.transactionType == 1) {
                    totalSupply += pending.amount;
                    emit SupplyMinted(lastblockNum, pending.amount, pending.pointToAddToBalance.chainId);
                } else if (pending.transactionType == 2) {
                    totalSupply -= pending.amount;
                    emit BurnSuccessful(pending.pointToAddToBalance.chainId, pending.amount);
                }

                indicesToDelete[deleteCount] = i;
                deleteCount++;
            }
        }

        for (uint256 i = 0; i < deleteCount; i++) {
            uint256 index = indicesToDelete[i];
            delete pendingMintsAndBurns[index];
        }
        uint256 length = pendingMintsAndBurns.length;
        uint256 writeIndex = 0;

        for (uint256 i = 0; i < length; i++) {
            if (pendingMintsAndBurns[i].amount != 0) {
                pendingMintsAndBurns[writeIndex] = pendingMintsAndBurns[i];
                writeIndex++;
            }
        }

        for (uint256 i = writeIndex; i < length; i++) {
            pendingMintsAndBurns.pop();
        }
    }

    function addPendingTransaction(
        uint8 k,
        Point[] memory commitments,
        Proof memory proof,
        uint256[] memory chainIds,
        uint256 _nullifier,
        uint256 lastblockNumAtCurrentBlockNum,
        uint256 currentBlockNumber
    ) internal {
        // Retrieve public values
        (EnygmaPointWithChainId[] memory balances, EnygmaPointWithChainId[] memory publicKeys) = getPublicValuesByBlockNumber(lastblockNumAtCurrentBlockNum);

        // Create a new PendingTransaction in storage
        PendingTransaction storage newTx = pendingTransactions.push();

        // Populate pointsToAddToBalance and update balances
        _populatePointsAndUpdateBalances(k, commitments, proof, chainIds, balances, publicKeys, newTx, currentBlockNumber);

        // Set the nullifier
        newTx.nullifier = _nullifier;
    }

    function _populatePointsAndUpdateBalances(
        uint8 k,
        Point[] memory commitments,
        Proof memory proof,
        uint256[] memory chainIds,
        EnygmaPointWithChainId[] memory balances,
        EnygmaPointWithChainId[] memory publicKeys,
        PendingTransaction storage newTx,
        uint256 currentBlockNumber
    ) internal {
        uint256[] memory balanceIndices = new uint256[](chainIds.length);
        uint256[] memory publicKeyIndices = new uint256[](chainIds.length);

        // Find and store the corresponding indices for balances and publicKeys
        for (uint256 i = 0; i < chainIds.length; i++) {
            balanceIndices[i] = findEnygmaPointIndex(balances, chainIds[i]);
            publicKeyIndices[i] = findEnygmaPointIndex(publicKeys, chainIds[i]);

            require(balanceIndices[i] < balances.length, 'Matching balance for chainId not found');
            require(publicKeyIndices[i] < publicKeys.length, 'Matching public key for chainId not found');
        }

        // Iterate through commitments to validate and populate points
        for (uint256 i = 0; i < commitments.length; i++) {
            uint256 balanceIndex = balanceIndices[i];
            uint256 publicKeyIndex = publicKeyIndices[i];

            validatePublicSignals(i, k, proof, balances[balanceIndex], publicKeys[publicKeyIndex]);

            // Populate the new transaction
            newTx.pointsToAddToBalance.push(EnygmaPointWithChainId({c1: commitments[i].c1, c2: commitments[i].c2, chainId: chainIds[i]}));

            // Update the balances
            updateBalances(chainIds[i], commitments[i].c1, commitments[i].c2, currentBlockNumber, false);
        }
    }

    function validateTransferInputs(uint8 k, Point[] memory commitments, Proof memory proof, uint256[] memory chainIds, uint256 nullifier, uint256 currentBlockNumber) internal view {
        require(k >= 2, 'Invalid value for k');
        require(commitments.length == k, 'Wrong commitments length');
        require(chainIds.length == k, 'Wrong ChainIds Array length');
        require(proof.public_signal.length == 5 * k + 2, 'Wrong public_signal length in proof');
        require(verifiers[k] != address(0), 'Verifier not set for given k');
        require(currentBlockNumber > lastblockNum, 'BlockNumber in Proof was already finalised.');
        require(currentBlockNumber >= lastblockNumPending, 'Invalid BlockNumber Used in Proof.');
        require(isNullifierUnique(nullifier), 'Nullifier already used in pending transaction.');
    }

    function verifyProof(uint8 k, Proof memory proof) internal view {
        if (k == 2) {
            require(IEnygmaVerifierk2(verifiers[k]).verifyProof(proof.pi_a, proof.pi_b, proof.pi_c, convertToUint256Array12(proof.public_signal)), 'verifyProof returned false: Invalid proof');
        } else if (k == 6) {
            require(IEnygmaVerifierk6(verifiers[k]).verifyProof(proof.pi_a, proof.pi_b, proof.pi_c, convertToUint256Array32(proof.public_signal)), 'verifyProof returned false: Invalid proof');
        } else {
            revert('That value of k is not supported');
        }
    }

    function finalizeTransfer(uint256[] memory chainIds, bytes[] memory encryptedMessages) internal {
        for (uint256 i = 0; i < chainIds.length; i++) {
            BridgedTransferMetadata memory emptyMetadata;

            _raylsSendToResourceId(
                chainIds[i],
                Constants.RESOURCE_ID_ENYGMA_PL_EVENTS,
                abi.encodeWithSelector(EnygmaPLEvents.transferExecuted.selector, encryptedMessages[i]),
                bytes(''),
                bytes(''),
                bytes(''),
                emptyMetadata
            );
        }
    }

    function ensureBalanceInitialized(uint256 chainId) internal {
        if (referenceBalance[lastblockNum][chainId].c1 == 0 && referenceBalance[lastblockNum][chainId].c2 == 0) {
            referenceBalance[lastblockNum][chainId].c2 = 1;
        }
        if (referenceBalance[lastblockNumPending][chainId].c1 == 0 && referenceBalance[lastblockNumPending][chainId].c2 == 0) {
            referenceBalance[lastblockNumPending][chainId].c2 = 1;
        }
    }

    function validatePublicSignals(uint256 txIndex, uint8 k, Proof memory proof, EnygmaPointWithChainId memory balance, EnygmaPointWithChainId memory pk) internal pure {
        require(
            uint256(proof.public_signal[txIndex * 2]) == pk.c1 &&
                uint256(proof.public_signal[txIndex * 2 + 1]) == pk.c2 &&
                uint256(proof.public_signal[txIndex * 2 + (2 * k)]) == balance.c1 &&
                uint256(proof.public_signal[txIndex * 2 + (2 * k + 1)]) == balance.c2,
            'Invalid public signal for pk or balance'
        );
    }

    // Checks that all the balances add up to the total supply
    function checkTotalSumOfBalances(uint256 blockNumber) public view returns (bool) {
        uint256 x;
        uint256 y;

        ParticipantStorageV1 participantStorage = ParticipantStorageV1(participantStorageContract);
        uint256[] memory enygmaParticipants = participantStorage.getEnygmaAllParticipantsChainIds();

        for (uint256 i = 0; i < enygmaParticipants.length; i = i + 1) {
            uint256 chainId = enygmaParticipants[i];
            (uint256 xBalance, uint256 yBalance) = getBalanceByBlockNumber(chainId, blockNumber);
            (x, y) = CurveBabyJubJub.pointAdd(x, y, xBalance, yBalance);
        }
        require(totalSupplyX == x && totalSupplyY == y, 'Values dont match');
        return true;
    }

    //TO DO: gate this function
    function addVerifier(address verifier, uint8 k) public returns (bool) {
        verifiers[k] = verifier;

        emit VerifierRegistered(verifier, k);
        return true;
    }

    function getBalanceFinalised(uint256 chainId) public view returns (uint256 x, uint256 y) {
        if (referenceBalance[lastblockNum][chainId].c1 == 0 && referenceBalance[lastblockNum][chainId].c2 == 0) {
            return (0, 1);
        } else {
            return (referenceBalance[lastblockNum][chainId].c1, referenceBalance[lastblockNum][chainId].c2);
        }
    }

    function getBalancePending(uint256 chainId) public view returns (uint256 x, uint256 y) {
        if (referenceBalance[lastblockNumPending][chainId].c1 == 0 && referenceBalance[lastblockNumPending][chainId].c2 == 0) {
            return (0, 1);
        } else {
            return (referenceBalance[lastblockNumPending][chainId].c1, referenceBalance[lastblockNumPending][chainId].c2);
        }
    }

    function getBalanceByBlockNumber(uint256 chainId, uint256 blockNumber) public view returns (uint256 x, uint256 y) {
        if (referenceBalance[blockNumber][chainId].c1 == 0 && referenceBalance[blockNumber][chainId].c2 == 0) {
            return (0, 1);
        } else {
            return (referenceBalance[blockNumber][chainId].c1, referenceBalance[blockNumber][chainId].c2);
        }
    }

    function getPublicValuesByBlockNumber(uint256 blockNumber) public view returns (EnygmaPointWithChainId[] memory, EnygmaPointWithChainId[] memory) {
        ParticipantStorageV1 participantStorage = ParticipantStorageV1(participantStorageContract);
        uint256[] memory chainsRegisteredForEnygma = participantStorage.getEnygmaAllParticipantsChainIds();
        uint256 totalChainsRegistered = chainsRegisteredForEnygma.length;

        EnygmaPointWithChainId[] memory refBalances = new EnygmaPointWithChainId[](totalChainsRegistered);
        for (uint256 i = 0; i < totalChainsRegistered; i++) {
            uint256 chainId = chainsRegisteredForEnygma[i];
            (uint256 xBalance, uint256 yBalance) = getBalanceByBlockNumber(chainId, blockNumber);
            refBalances[i] = EnygmaPointWithChainId(xBalance, yBalance, chainId);
        }

        ParticipantStorageV1.PrivateLedgerDataEnygmaSafeReturn[] memory allBabyjubjubKeys = participantStorage.getEnygmaAllBabyJubjubKeys();

        EnygmaPointWithChainId[] memory publicKeys = new EnygmaPointWithChainId[](totalChainsRegistered);
        for (uint256 i = 0; i < totalChainsRegistered; i++) {
            ParticipantStorageV1.PrivateLedgerDataEnygmaSafeReturn memory babyJubjubKey = allBabyjubjubKeys[i];

            publicKeys[i].c1 = babyJubjubKey.babyJubjubX;
            publicKeys[i].c2 = babyJubjubKey.babyJubjubY;
            publicKeys[i].chainId = babyJubjubKey.chainId;
        }
        return (refBalances, publicKeys);
    }

    function getPublicValuesFinalised() public view returns (EnygmaPointWithChainId[] memory, EnygmaPointWithChainId[] memory) {
        ParticipantStorageV1 participantStorage = ParticipantStorageV1(participantStorageContract);
        uint256[] memory chainsRegisteredForEnygma = participantStorage.getEnygmaAllParticipantsChainIds();
        uint256 totalChainsRegistered = chainsRegisteredForEnygma.length;

        EnygmaPointWithChainId[] memory refBalances = new EnygmaPointWithChainId[](totalChainsRegistered);
        for (uint256 i = 0; i < totalChainsRegistered; i++) {
            uint256 chainId = chainsRegisteredForEnygma[i];
            (uint256 xBalance, uint256 yBalance) = getBalanceFinalised(chainId);
            refBalances[i] = EnygmaPointWithChainId(xBalance, yBalance, chainId);
        }

        ParticipantStorageV1.PrivateLedgerDataEnygmaSafeReturn[] memory allBabyjubjubKeys = participantStorage.getEnygmaAllBabyJubjubKeys();

        EnygmaPointWithChainId[] memory publicKeys = new EnygmaPointWithChainId[](totalChainsRegistered);
        for (uint256 i = 0; i < totalChainsRegistered; i++) {
            ParticipantStorageV1.PrivateLedgerDataEnygmaSafeReturn memory babyJubjubKey = allBabyjubjubKeys[i];

            publicKeys[i].c1 = babyJubjubKey.babyJubjubX;
            publicKeys[i].c2 = babyJubjubKey.babyJubjubY;
            publicKeys[i].chainId = babyJubjubKey.chainId;
        }
        return (refBalances, publicKeys);
    }

    function getPublicValuesPending() public view returns (EnygmaPointWithChainId[] memory, EnygmaPointWithChainId[] memory) {
        ParticipantStorageV1 participantStorage = ParticipantStorageV1(participantStorageContract);
        uint256[] memory chainsRegisteredForEnygma = participantStorage.getEnygmaAllParticipantsChainIds();
        uint256 totalChainsRegistered = chainsRegisteredForEnygma.length;

        EnygmaPointWithChainId[] memory refBalances = new EnygmaPointWithChainId[](totalChainsRegistered);
        for (uint256 i = 0; i < totalChainsRegistered; i++) {
            uint256 chainId = chainsRegisteredForEnygma[i];
            (uint256 xBalance, uint256 yBalance) = getBalancePending(chainId);
            refBalances[i] = EnygmaPointWithChainId(xBalance, yBalance, chainId);
        }

        ParticipantStorageV1.PrivateLedgerDataEnygmaSafeReturn[] memory allBabyjubjubKeys = participantStorage.getEnygmaAllBabyJubjubKeys();

        EnygmaPointWithChainId[] memory publicKeys = new EnygmaPointWithChainId[](totalChainsRegistered);
        for (uint256 i = 0; i < totalChainsRegistered; i++) {
            ParticipantStorageV1.PrivateLedgerDataEnygmaSafeReturn memory babyJubjubKey = allBabyjubjubKeys[i];

            publicKeys[i].c1 = babyJubjubKey.babyJubjubX;
            publicKeys[i].c2 = babyJubjubKey.babyJubjubY;
            publicKeys[i].chainId = babyJubjubKey.chainId;
        }
        return (refBalances, publicKeys);
    }

    function getPendingTransactions() public view returns (PendingTransaction[] memory) {
        return pendingTransactions;
    }

    function getPendingMintsAndBurns() external view returns (PendingMintOrBurn[] memory) {
        return pendingMintsAndBurns;
    }

    function getLastblockNumAtCurrentBlockNumber(uint256 currentBlockNumber) external view returns (uint256) {
        return lastblockNumAtCurrentBlockNumber[currentBlockNumber];
    }

    function Name() public view returns (string memory) {
        return name;
    }

    function Symbol() public view returns (string memory) {
        return symbol;
    }

    function getTotalRegisteredBanks() public view returns (uint256) {
        ParticipantStorageV1 participantStorage = ParticipantStorageV1(participantStorageContract);
        uint256[] memory enygmaParticipants = participantStorage.getEnygmaAllParticipantsChainIds();
        uint256 totalParticipants = enygmaParticipants.length;
        return totalParticipants;
    }

    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }

    function getVerifierAddress(uint8 k) public view returns (address) {
        return verifiers[k];
    }

    function convertToUint256Array12(uint256[] memory dynamicArray) internal pure returns (uint256[12] memory fixedArray) {
        require(dynamicArray.length == 12, 'Input array must have exactly 12 elements');

        for (uint256 i = 0; i < 12; i++) {
            fixedArray[i] = dynamicArray[i];
        }

        return fixedArray;
    }

    function convertToUint256Array32(uint256[] memory dynamicArray) internal pure returns (uint256[32] memory fixedArray) {
        require(dynamicArray.length == 32, 'Input array must have exactly 32 elements');

        for (uint256 i = 0; i < 32; i++) {
            fixedArray[i] = dynamicArray[i];
        }

        return fixedArray;
    }

    function findEnygmaPointIndex(EnygmaPointWithChainId[] memory points, uint256 chainId) internal pure returns (uint256) {
        for (uint256 i = 0; i < points.length; i++) {
            if (points[i].chainId == chainId) {
                return i;
            }
        }
        revert('Chain ID not found in points array');
    }

    // Derives a set of points in the BabyJubJub curve from an input with a Generator
    function derivePk(uint256 v) public view returns (uint256 x2, uint256 y2) {
        (x2, y2) = CurveBabyJubJub.derivePk(v);
    }

    // Derives a set of points in the BabyJubJub curve from an input with an H value
    function derivePkH(uint256 r) public view returns (uint256 x2, uint256 y2) {
        (x2, y2) = CurveBabyJubJub.derivePkH(r);
    }

    // Prints a pederson commitment
    function pedCom(uint256 v, uint256 r) public view returns (uint256, uint256) {
        (uint256 gX, uint256 gY) = derivePk(v);
        (uint256 hX, uint256 hY) = derivePkH(r);
        (uint256 pedComX, uint256 pedComY) = CurveBabyJubJub.pointAdd(gX, gY, hX, hY);
        return (pedComX, pedComY);
    }
}
