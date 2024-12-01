// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BaseTokenSale is Ownable {
    struct DepositInfo {
        address depositOwner;
        uint256 pricePerUnit; // Price in accepted token units
        uint256 balance; // ERC20 balance
        address[] acceptedTokens; // Array of accepted tokens for payment
        bool isNFT; // If true, represents an NFT
        uint256 tokenId; // NFT token ID
    }

    mapping(address => DepositInfo) public deposits;
    mapping(address => bool) public allowedTokens; // Tracks which tokens are allowed for payment

    // Events
    event DepositUpdated(address indexed token, address indexed owner, uint256 amount, uint256 pricePerUnit);
    event TokenSold(address indexed buyer, address indexed token, uint256 amount, address paymentToken, uint256 price);
    event TokensRecovered(address indexed token, uint256 amount, address indexed recipient);

    // Admin: Allow or disallow payment tokens
    function setAllowedToken(address token, bool allowed) external onlyOwner {
        allowedTokens[token] = allowed;
    }

    // Deposit or update tokens (ERC20 or NFT)
    function depositOrUpdate(
        address token,
        uint256 amount,
        uint256 pricePerUnit,
        address[] memory acceptedTokens,
        uint256 tokenId,
        bool isNFT
    ) external {
        require(token != address(0), "Invalid token address");
        require(pricePerUnit > 0, "Price must be greater than zero");
        require(acceptedTokens.length > 0, "Accepted tokens cannot be empty");

        DepositInfo storage info = deposits[token];
        info.depositOwner = msg.sender;
        info.pricePerUnit = pricePerUnit;
        info.acceptedTokens = acceptedTokens;
        info.isNFT = isNFT;

        if (isNFT) {
            IERC721 nft = IERC721(token);
            require(nft.ownerOf(tokenId) == msg.sender, "Not the NFT owner");
            require(
                nft.getApproved(tokenId) == address(this) || nft.isApprovedForAll(msg.sender, address(this)),
                "NFT not approved for transfer"
            );

            nft.transferFrom(msg.sender, address(this), tokenId);
            info.tokenId = tokenId;
        } else {
            require(amount > 0, "Amount must be greater than zero");
            info.balance += amount;
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        }

        emit DepositUpdated(token, msg.sender, amount, pricePerUnit);
    }

    // Buy tokens with accepted payment tokens
    function buyToken(
        address token,
        uint256 amount,
        address paymentToken,
        uint256 paymentAmount
    ) external {
        DepositInfo storage info = deposits[token];
        require(info.depositOwner != address(0), "Token not available for sale");
        require(amount > 0, "Invalid amount");
        require(isAcceptedPaymentToken(info, paymentToken), "Payment token not accepted");

        uint256 totalCost = info.pricePerUnit * amount;
        require(paymentAmount == totalCost, "Incorrect payment amount");

        IERC20(paymentToken).transferFrom(msg.sender, info.depositOwner, paymentAmount);

        if (info.isNFT) {
            require(amount == 1, "Can only purchase one NFT");
            IERC721(token).transferFrom(address(this), msg.sender, info.tokenId);
            delete deposits[token]; // Remove NFT listing after purchase
        } else {
            require(info.balance >= amount, "Insufficient token balance");
            info.balance -= amount;
            IERC20(token).transfer(msg.sender, amount);
        }

        emit TokenSold(msg.sender, token, amount, paymentToken, totalCost);
    }

    // Withdraw stuck tokens or NFTs (admin-only)
    function recoverTokens(
        address token,
        uint256 amount,
        address recipient
    ) external onlyOwner {
        if (deposits[token].isNFT) {
            IERC721(token).transferFrom(address(this), recipient, deposits[token].tokenId);
        } else {
            IERC20(token).transfer(recipient, amount);
        }

        emit TokensRecovered(token, amount, recipient);
    }

    // Check if a payment token is accepted for a specific deposit
    function isAcceptedPaymentToken(DepositInfo storage info, address paymentToken) internal view returns (bool) {
        for (uint256 i = 0; i < info.acceptedTokens.length; i++) {
            if (info.acceptedTokens[i] == paymentToken) {
                return true;
            }
        }
        return false;
    }
}
