// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract Escrow is Ownable {
    using Counters for Counters.Counter;

    // Struct to track token deposits
    struct TokenDeposit {
        address depositor;
        address tokenAddress;
        uint256 amount;
        uint256 timestamp;
    }

    // Struct to track releases
    struct ReleaseRecord {
        string releaseId;
        address[] recipients;
        uint256[] amounts;
        bool isFullRelease;
        string dataJson;
        uint256 timestamp;
    }

    // Main Escrow structure
    struct EscrowDetails {
        uint256 escrowId;
        address creator;
        bool isClosed;
        bool isLocked;
        string dataJson;
        TokenDeposit[] deposits;
        ReleaseRecord[] releases;
        uint256 totalTokensDeposited;
        uint256 totalTokensReleased;
        uint256 releaseCount;  // Add this line to track release count
    }

    // Mapping to store escrows
    mapping(uint256 => EscrowDetails) private escrows;
    Counters.Counter private escrowCounter;
    Counters.Counter private releaseCounter;

    // Events
    event EscrowCreated(uint256 indexed escrowId, address creator);
    event TokensDeposited(uint256 indexed escrowId, address depositor, address tokenAddress, uint256 amount);
    event TokensReleased(uint256 indexed escrowId, string releaseId, address[] recipients, uint256[] amounts);
    event EscrowModified(uint256 indexed escrowId, string newMetadata);
    event EscrowLocked(uint256 indexed escrowId);
    event EscrowClosed(uint256 indexed escrowId);

    // Modifier to check if escrow exists
    modifier escrowExists(uint256 escrowId) {
        require(escrows[escrowId].escrowId != 0, "Escrow does not exist");
        _;
    }

    // Modifier to check if escrow is not closed
    modifier escrowNotClosed(uint256 escrowId) {
        require(!escrows[escrowId].isClosed, "Escrow is closed");
        _;
    }

    // Function to get escrow details including deposits and releases
    // function getEscrow(uint256 escrowId) public view escrowExists(escrowId) returns (EscrowDetails memory) {
    //     return escrows[escrowId];
    // }

    // Function to manage escrow (create or modify)
    function manageEscrow(
        uint256 escrowId, 
        string memory metadataJson
    ) public returns (uint256) {
        if (escrowId == 0) {
            // Create new escrow
            escrowCounter.increment();
            escrowId = escrowCounter.current();

            escrows[escrowId] = EscrowDetails({
                escrowId: escrowId,
                creator: msg.sender,
                isLocked: false,
                isClosed: false,
                dataJson: metadataJson,
                deposits: new TokenDeposit[](0),
                releases: new ReleaseRecord[](0),
                totalTokensDeposited: 0,
                totalTokensReleased: 0,
                releaseCount: 0
            });

            emit EscrowCreated(escrowId, msg.sender);
            return escrowId;
        } else {
            // Modify existing escrow
            require(
                msg.sender == escrows[escrowId].creator || msg.sender == owner(), 
                "Not authorized to modify escrow"
            );
            require(!escrows[escrowId].isLocked, "Escrow is locked");

            escrows[escrowId].dataJson = metadataJson;
            emit EscrowModified(escrowId, metadataJson);
            return escrowId;
        }
    }

    // Function to deposit tokens
    // needs approval called before on the token being transfered
    function depositTokens(
        uint256 escrowId, 
        address tokenAddress, 
        uint256 amount
    ) public escrowExists(escrowId) escrowNotClosed(escrowId) {
        require(amount > 0, "Deposit amount must be greater than 0");
        
        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(msg.sender, address(this), amount), "Token transfer failed");

        escrows[escrowId].deposits.push(TokenDeposit({
            depositor: msg.sender,
            tokenAddress: tokenAddress,
            amount: amount,
            timestamp: block.timestamp
        }));

        emit TokensDeposited(escrowId, msg.sender, tokenAddress, amount);
    }

    // Function to release tokens
    function release(
        uint256 escrowId,
        address[] memory recipients,
        uint256[] memory amounts,
        bool isFullRelease,
        string memory dataJson
    ) public escrowExists(escrowId) escrowNotClosed(escrowId) {
        EscrowDetails storage escrow = escrows[escrowId];
        require(msg.sender == escrow.creator || msg.sender == owner(), "Not authorized to release");

        // If only one recipient and full release, distribute all tokens
        if (recipients.length == 1 && isFullRelease && amounts.length == 0) {
            _releaseAllTokens(escrow, recipients, dataJson);
        } else {
            _releasePartialTokens(escrow, recipients, amounts, isFullRelease, dataJson);
        }
    }

    function _releaseAllTokens(
        EscrowDetails storage escrow, 
        address[] memory recipients, 
        string memory dataJson
    ) internal {
        require(!escrow.isLocked, "Escrow is locked");
        require(!escrow.isClosed, "Escrow is already closed");
        require(recipients.length == 1, "Only one recipient allowed for full release");

        address recipient = recipients[0];
        uint256 totalTokensReleased = 0;

        for (uint256 i = 0; i < escrow.deposits.length; i++) {
            TokenDeposit memory deposit = escrow.deposits[i];
            IERC20 token = IERC20(deposit.tokenAddress);
            
            // Calculate the remaining amount after previous releases
            uint256 totalReleased = _calculateReleasedAmount(escrow, deposit.depositor);
            uint256 remainingAmount = deposit.amount - totalReleased;
            
            if (remainingAmount > 0) {
                require(token.transfer(recipient, remainingAmount), "Token transfer failed");
                totalTokensReleased += remainingAmount;
            }
        }

        // Create release record
        escrow.releaseCount++;
        string memory releaseId = _generateReleaseId(escrow.escrowId, escrow.releaseCount);
        
        uint256[] memory releaseAmounts = new uint256[](1);
        releaseAmounts[0] = totalTokensReleased;

        ReleaseRecord memory releaseRecord = ReleaseRecord({
            releaseId: releaseId,
            recipients: recipients,
            amounts: releaseAmounts,
            isFullRelease: true,
            timestamp: block.timestamp,
            dataJson: dataJson
        });
        escrow.releases.push(releaseRecord);

        // Update escrow state
        escrow.isClosed = true;
        escrow.totalTokensReleased += totalTokensReleased;

        emit EscrowClosed(escrow.escrowId);
        emit TokensReleased(escrow.escrowId, releaseId, recipients, releaseAmounts);
    }

    // Helper function to generate release ID
    function _generateReleaseId(uint256 escrowId, uint256 releaseCount) private pure returns (string memory) {
        return string(abi.encodePacked(
            Strings.toString(escrowId), 
            "-", 
            Strings.toString(releaseCount)
        ));
    }

    // Internal function to release partial tokens
    function _releasePartialTokens(
        EscrowDetails storage escrow, 
        address[] memory recipients,
        uint256[] memory amounts,
        bool isFullRelease,
        string memory dataJson
    ) internal {
        require(recipients.length == amounts.length, "Mismatched recipients and amounts");
        
        escrow.releaseCount++;  // Increment release count
        string memory releaseId = _generateReleaseId(escrow.escrowId, escrow.releaseCount);

        uint256 totalReleased = 0;
        for (uint i = 0; i < recipients.length; i++) {
            IERC20 token = IERC20(escrow.deposits[0].tokenAddress);
            require(token.transfer(recipients[i], amounts[i]), "Token transfer failed");
            totalReleased += amounts[i];
        }

        // If full release, ensure all tokens are accounted for
        if (isFullRelease) {
            uint256 totalDeposited = 0;
            for (uint i = 0; i < escrow.deposits.length; i++) {
                totalDeposited += escrow.deposits[i].amount;
            }
            require(totalReleased == totalDeposited, "Not all tokens released");
            escrow.isClosed = true;
        }

        escrow.releases.push(ReleaseRecord({
            releaseId: releaseId,
            recipients: recipients,
            amounts: amounts,
            isFullRelease: isFullRelease,
            dataJson: dataJson,
            timestamp: block.timestamp
        }));

        emit TokensReleased(escrow.escrowId, releaseId, recipients, amounts);
    }

    // Function to refund tokens proportionally
    function refund(uint256 escrowId) public escrowExists(escrowId) {
        EscrowDetails storage escrow = escrows[escrowId];
        require(escrow.isClosed, "Escrow must be closed to refund");

        for (uint i = 0; i < escrow.deposits.length; i++) {
            TokenDeposit memory deposit = escrow.deposits[i];
            uint256 totalDeposited = deposit.amount;
            uint256 totalReleased = _calculateReleasedAmount(escrow, deposit.depositor);
            
            uint256 refundAmount = totalDeposited - totalReleased;
            if (refundAmount > 0) {
                IERC20 token = IERC20(deposit.tokenAddress);
                require(token.transfer(deposit.depositor, refundAmount), "Refund transfer failed");
            }
        }
    }

    // Helper function to calculate released amount for a specific depositor
    function _calculateReleasedAmount(
        EscrowDetails storage escrow, 
        address depositor
    ) internal view returns (uint256) {
        uint256 releasedAmount = 0;
        for (uint256 i = 0; i < escrow.releases.length; i++) {
            ReleaseRecord memory currentRelease = escrow.releases[i];
            for (uint256 j = 0; j < currentRelease.recipients.length; j++) {
                if (currentRelease.recipients[j] == depositor) {
                    releasedAmount += currentRelease.amounts[j];
                }
            }
        }
        return releasedAmount;
    }

    // Function to lock escrow (only callable by creator or owner)
    function lockEscrow(uint256 escrowId) public escrowExists(escrowId) {
        require(
            msg.sender == escrows[escrowId].creator || msg.sender == owner(), 
            "Not authorized to lock escrow"
        );
        escrows[escrowId].isLocked = true;
        emit EscrowLocked(escrowId);
    }
}