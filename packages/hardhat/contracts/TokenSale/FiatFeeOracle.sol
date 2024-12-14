// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

interface ITokenSale {
    function buyToken(address token, uint256 amount, address paymentToken, uint256 paymentAmount) external;
}

contract FiatFeeOracle is Ownable {
    struct FeeInfo {
        uint256 feePercentage; // Fee percentage (e.g., 200 = 2.00%)
        address feeRecipient; // Address to receive fees
    }

    mapping(address => FeeInfo) public tokenFees;
    mapping(address => bool) public whitelist; // Addresses allowed to use fiat payments
    address public tokenSaleContract;

    // Events
    event FiatPurchase(address indexed buyer, address indexed token, uint256 amount, uint256 fiatValue);
    event FeeUpdated(address indexed token, uint256 feePercentage, address feeRecipient);
    event WhitelistUpdated(address indexed user, bool status);

    constructor(address saleContract) {
        tokenSaleContract = saleContract;
    }

    // Admin: Set fees for a token
    function setTokenFee(
        address token,
        uint256 feePercentage,
        address feeRecipient
    ) external onlyOwner {
        require(feeRecipient != address(0), "Invalid fee recipient");
        tokenFees[token] = FeeInfo(feePercentage, feeRecipient);
        emit FeeUpdated(token, feePercentage, feeRecipient);
    }

    // Admin: Update whitelist status
    function updateWhitelist(address user, bool status) external onlyOwner {
        whitelist[user] = status;
        emit WhitelistUpdated(user, status);
    }

    // Handle fiat purchases
    function registerFiatPurchase(
        address buyer,
        address token,
        uint256 amount,
        uint256 fiatValue
    ) external onlyOwner {
        require(whitelist[buyer], "Buyer not whitelisted");

        FeeInfo memory fee = tokenFees[token];
        uint256 feeAmount = (fiatValue * fee.feePercentage) / 10000;
        uint256 sellerAmount = fiatValue - feeAmount;

        if (feeAmount > 0) {
            payable(fee.feeRecipient).transfer(feeAmount);
        }

        ITokenSale(tokenSaleContract).buyToken(token, amount, address(0), sellerAmount);
        emit FiatPurchase(buyer, token, amount, fiatValue);
    }

    // Update token sale contract
    function updateTokenSaleContract(address newContract) external onlyOwner {
        require(newContract != address(0), "Invalid contract address");
        tokenSaleContract = newContract;
    }
}
