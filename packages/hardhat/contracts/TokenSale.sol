// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TokenSale is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Compact struct to store token sale information
    struct TokenInfo {
        address owner;
        address[] acceptedTokens;
        mapping(address => uint256) prices;
        uint256 balance;
        bool isNFT;
        uint256 tokenId;
        uint256 priceIncreaseAmount;
        uint256 priceIncreaseType;
        uint256 totalPurchased;
    }

    // Consolidated mappings
    mapping(address => TokenInfo) public tokens;
    mapping(address => mapping(address => uint256)) public fees;

    // Simplified constants and state variables
    uint256 public constant MAX_FEE = 20;
    uint256 public feePercent = 3;
    address public paymentOracle;
    address public constant FIAT_TOKEN = address(1);

    // Condensed events
    event TokenPurchased(
        address indexed buyer, 
        address indexed token, 
        uint256 amount, 
        uint256 price
    );

    // Constructor
    constructor(address _paymentOracle) {
        require(_paymentOracle != address(0), "Invalid oracle");
        paymentOracle = _paymentOracle;
    }

    // Unified deposit and update function
    function manageToken(
        address token,
        uint256 amount,
        address[] calldata acceptedTokens,
        uint256[] calldata prices,
        bool isNFT,
        uint256 tokenId,
        uint256 priceIncreaseAmount,
        uint256 priceIncreaseType
    ) external nonReentrant whenNotPaused {
        TokenInfo storage info = tokens[token];
        
        // Initial setup or update check
        require(info.owner == address(0) || info.owner == msg.sender, "Unauthorized");
        
        // Token transfer logic
        if (isNFT) {
            require(amount == 1 && tokenId > 0, "Invalid NFT");
            IERC721(token).transferFrom(msg.sender, address(this), tokenId);
            info.tokenId = tokenId;
        } else {
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            info.balance += amount;
        }

        // Update token information
        info.owner = msg.sender;
        info.isNFT = isNFT;
        info.acceptedTokens = acceptedTokens;
        info.priceIncreaseAmount = priceIncreaseAmount;
        info.priceIncreaseType = priceIncreaseType;
        
        // Set prices for accepted tokens
        for (uint256 i = 0; i < acceptedTokens.length; i++) {
            info.prices[acceptedTokens[i]] = prices[i];
        }
    }

    // Unified buy function with price increase mechanism
    function buyToken(
        address depositToken,
        address purchaseToken,
        address recipient,
        uint256 amount,
        uint256 tokenId
    ) external nonReentrant whenNotPaused {
        TokenInfo storage info = tokens[depositToken];
        recipient = recipient == address(0) ? msg.sender : recipient;

        // Validate purchase
        require(info.prices[purchaseToken] > 0, "Token not for sale");
        
        // Price calculation with increase mechanism
        uint256 basePrice = info.prices[purchaseToken];
        uint256 price = basePrice;
        
        if (info.priceIncreaseAmount > 0) {
            price = info.priceIncreaseType == 0 
                ? basePrice + (info.priceIncreaseAmount * info.totalPurchased)
                : basePrice + (basePrice * info.priceIncreaseAmount * info.totalPurchased / 100);
        }

        // Calculate total price and fees
        uint256 totalPrice = price * amount;
        uint256 fee = (totalPrice * feePercent) / 100;
        
        // Payment handling
        IERC20(purchaseToken).safeTransferFrom(msg.sender, address(this), totalPrice);
        fees[depositToken][purchaseToken] += fee;

        // Token transfer
        if (info.isNFT) {
            require(amount == 1 && tokenId == info.tokenId, "Invalid NFT transfer");
            IERC721(depositToken).transferFrom(address(this), recipient, tokenId);
        } else {
            require(info.balance >= amount, "Insufficient balance");
            IERC20(depositToken).safeTransfer(recipient, amount);
            info.balance -= amount;
        }

        // Update purchase tracking
        info.totalPurchased += amount;
        info.prices[purchaseToken] = price;

        emit TokenPurchased(msg.sender, depositToken, amount, price);
    }

    // Admin functions
    function setFeePercent(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= MAX_FEE, "Fee too high");
        feePercent = _feePercent;
    }

    function setPaymentOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle");
        paymentOracle = _oracle;
    }
}
