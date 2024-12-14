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

    uint256 public constant MAX_FEE_PERCENT = 20;
    uint256 public feePercent = 3;
    mapping(address => mapping(address => uint256)) public tokenFees; // depositToken => paymentToken => fee amount
    mapping(address => mapping(address => uint256)) public salesProceeds; // depositToken => paymentToken => sales proceeds
    address[] public trackedTokens;
    address public paymentOracle;
    address public constant FIAT_TOKEN_ADDRESS = address(1); // Special address to represent fiat payments

    // Struct to track NFT token details
    struct NFTTokenInfo {
        uint256 tokenId;
        bool isAvailable;
    }

    // Modify TokenInfo to include comprehensive NFT tracking
    struct TokenInfo {
        address depositTokenOwner;
        address[] acceptedTokens;
        mapping(address => uint256) acceptedTokenPrices;
        mapping(address => uint256) tokenBalance;
        uint256 depositTokenBalance;
        
        // NFT-specific tracking
        mapping(uint256 => NFTTokenInfo) nftTokens;
        uint256[] availableTokenIds;
        
        // Fiat purchase parameters
        bool canBePurchasedInFiat;
        uint256 priceInFiat;
        
        // Price increase mechanism
        uint256 priceIncreaseAmount;
        uint256 priceIncreaseType;
        uint256 totalTokensPurchased;
        
        bool isNFT;
        uint256 lastUpdateTime;
    }

    mapping(address => TokenInfo) public depositTokenInfo;
    mapping(address => bool) public isDepositToken;

    // Restore comprehensive events
    event DepositUpdated(
        address indexed token,
        address indexed owner,
        uint256 amount,
        address[] acceptedTokens,
        bool fiatEnabled,
        uint256 fiatPrice
    );
    event TokenTransaction(
        address indexed purchaser,
        address indexed depositToken,
        address purchaseToken,
        uint256 amount,
        uint256 price,
        bool isFiat
    );
    event FiatPurchase(
        address indexed buyer,
        address indexed depositToken,
        uint256 amountReceived
    );
    event EmergencyRecovery(
        address indexed token,
        address indexed recipient,
        uint256 amount,
        bool isNFT
    );
    event ConfigUpdate(string indexed updateType, uint256 value);
    event ProceedsWithdrawn(
        address indexed depositToken, 
        address indexed paymentToken, 
        address indexed owner, 
        uint256 amount
    );
    event FeesCollected(
        address indexed depositToken, 
        address indexed paymentToken, 
        uint256 amount
    );

    modifier onlyPaymentOracle() {
        require(msg.sender == paymentOracle, "Only payment oracle");
        _;
    }

    // Consolidated deposit parameters struct to reduce stack depth
    struct DepositParams {
        bool isNFT;
        uint256 amount;
        uint256 tokenId;
        address[] acceptedTokens;
        uint256[] prices;
        bool enableFiat;
        uint256 fiatPrice;
        uint256 priceIncreaseAmount;
        uint256 priceIncreaseType;
    }

    constructor(address _paymentOracle) {
        require(_paymentOracle != address(0), "Invalid payment oracle address");
        paymentOracle = _paymentOracle;
    }

    function getCurrentPrice(
        address depositToken, 
        address purchaseToken
    ) external view returns (uint256) {
        TokenInfo storage info = depositTokenInfo[depositToken];
        return purchaseToken == FIAT_TOKEN_ADDRESS 
            ? info.priceInFiat 
            : info.acceptedTokenPrices[purchaseToken];
    }

    function manageDeposit(
        address token,
        DepositParams calldata params
    ) external virtual nonReentrant whenNotPaused {
        TokenInfo storage info = depositTokenInfo[token];
        bool isUpdate = isDepositToken[token];

        // Validate input
        require(
            !isUpdate || info.depositTokenOwner == msg.sender, 
            "Unauthorized or invalid token"
        );

        // Handle token deposit
        if (params.amount > 0) {
            if (params.isNFT) {
                require(params.tokenId > 0, "Invalid NFT");
                IERC721(token).transferFrom(msg.sender, address(this), params.tokenId);
                
                // Track available NFT tokens
                if (!info.nftTokens[params.tokenId].isAvailable) {
                    info.nftTokens[params.tokenId] = NFTTokenInfo({
                        tokenId: params.tokenId,
                        isAvailable: true
                    });
                    info.availableTokenIds.push(params.tokenId);
                }
            } else {
                IERC20(token).safeTransferFrom(msg.sender, address(this), params.amount);
                info.depositTokenBalance += params.amount;
            }
        }

        // Update token information
        info.depositTokenOwner = msg.sender;
        info.isNFT = params.isNFT;
        info.acceptedTokens = params.acceptedTokens;
        
        // Set accepted token prices
        for (uint256 i = 0; i < params.acceptedTokens.length; i++) {
            info.acceptedTokenPrices[params.acceptedTokens[i]] = params.prices[i];
        }

        // Fiat purchase configuration
        info.canBePurchasedInFiat = params.enableFiat;
        info.priceInFiat = params.fiatPrice;

        // Price increase parameters
        info.priceIncreaseAmount = params.priceIncreaseAmount;
        info.priceIncreaseType = params.priceIncreaseType;
        info.totalTokensPurchased = 0;
        info.lastUpdateTime = block.timestamp;

        if (!isUpdate) {
            isDepositToken[token] = true;
            trackToken(token);
        }

        emit DepositUpdated(
            token, 
            msg.sender, 
            params.amount, 
            params.acceptedTokens, 
            params.enableFiat, 
            params.fiatPrice
        );
    }

    // Consolidated purchase parameters struct
    struct PurchaseParams {
        address purchaseToken;
        address recipient;
        uint256 amount;
        uint256 tokenId;
    }

    function buyToken(
        address depositToken,
        PurchaseParams memory params
    ) public virtual nonReentrant whenNotPaused {
        params.recipient = params.recipient == address(0) ? msg.sender : params.recipient;
        
        TokenInfo storage info = depositTokenInfo[depositToken];
        require(isDepositToken[depositToken], "Token not for sale");

        // Fiat purchase handling
        if (params.purchaseToken == FIAT_TOKEN_ADDRESS) {
            require(msg.sender == paymentOracle, "Only payment oracle");
            require(info.canBePurchasedInFiat, "Fiat not accepted");
        } else {
            require(info.acceptedTokenPrices[params.purchaseToken] > 0, "Token not accepted");
        }

        // NFT-specific checks
        if (info.isNFT) {
            require(params.amount == 1, "NFT purchase amount must be 1");
            require(info.nftTokens[params.tokenId].isAvailable, "Token not available");
        } else {
            require(info.depositTokenBalance >= params.amount, "Insufficient balance");
        }

        // Price calculation
        uint256 price = params.purchaseToken == FIAT_TOKEN_ADDRESS 
            ? info.priceInFiat 
            : info.acceptedTokenPrices[params.purchaseToken];
        
        uint256 totalPrice = price * params.amount;
        uint256 fee = (totalPrice * feePercent) / 100;
        uint256 netProceeds = totalPrice - fee;

        // Payment and fee collection
        if (params.purchaseToken != FIAT_TOKEN_ADDRESS) {
            // Transfer total price from buyer to contract
            IERC20(params.purchaseToken).safeTransferFrom(msg.sender, address(this), totalPrice);
            
            // Collect fees in the contract
            tokenFees[depositToken][params.purchaseToken] += fee;
            
            // Track sales proceeds for deposit token owner
            salesProceeds[depositToken][params.purchaseToken] += netProceeds;
        } else {
            emit FiatPurchase(params.recipient, depositToken, totalPrice);
        }

        // Token transfer
        if (info.isNFT) {
            IERC721(depositToken).transferFrom(address(this), params.recipient, params.tokenId);
            
            // Mark NFT as unavailable
            info.nftTokens[params.tokenId].isAvailable = false;
            
            // Remove from available token IDs
            for (uint256 i = 0; i < info.availableTokenIds.length; i++) {
                if (info.availableTokenIds[i] == params.tokenId) {
                    info.availableTokenIds[i] = info.availableTokenIds[info.availableTokenIds.length - 1];
                    info.availableTokenIds.pop();
                    break;
                }
            }
        } else {
            IERC20(depositToken).safeTransfer(params.recipient, params.amount);
            info.depositTokenBalance -= params.amount;
        }

        // Price increase mechanism
        if (info.priceIncreaseAmount > 0) {
            uint256 basePrice = params.purchaseToken == FIAT_TOKEN_ADDRESS 
                ? info.priceInFiat 
                : info.acceptedTokenPrices[params.purchaseToken];
            
            uint256 newPrice = info.priceIncreaseType == 0 
                ? basePrice + (info.priceIncreaseAmount * info.totalTokensPurchased)
                : basePrice + (basePrice * info.priceIncreaseAmount * info.totalTokensPurchased / 100);

            if (params.purchaseToken == FIAT_TOKEN_ADDRESS) {
                info.priceInFiat = newPrice;
            } else {
                info.acceptedTokenPrices[params.purchaseToken] = newPrice;
            }
        }

        info.totalTokensPurchased += params.amount;
        
        emit TokenTransaction(
            msg.sender, 
            depositToken, 
            params.purchaseToken, 
            params.amount, 
            price, 
            params.purchaseToken == FIAT_TOKEN_ADDRESS
        );
    }

    // Function for deposit token owner to withdraw sales proceeds
    function withdrawProceeds(address depositToken, address paymentToken) external {
        TokenInfo storage info = depositTokenInfo[depositToken];
        require(msg.sender == info.depositTokenOwner, "Only deposit token owner");
        
        uint256 proceeds = salesProceeds[depositToken][paymentToken];
        require(proceeds > 0, "No proceeds to withdraw");

        // Reset proceeds before transfer to prevent reentrancy
        salesProceeds[depositToken][paymentToken] = 0;

        // Transfer proceeds to deposit token owner
        IERC20(paymentToken).safeTransfer(msg.sender, proceeds);

        emit ProceedsWithdrawn(depositToken, paymentToken, msg.sender, proceeds);
    }

    // Function for contract owner to collect fees
    function collectFees(address depositToken, address paymentToken) external onlyOwner {
        uint256 feeAmount = tokenFees[depositToken][paymentToken];
        require(feeAmount > 0, "No fees to collect");

        // Reset fees before transfer to prevent reentrancy
        tokenFees[depositToken][paymentToken] = 0;

        // Transfer fees to contract owner
        IERC20(paymentToken).safeTransfer(owner(), feeAmount);

        emit FeesCollected(depositToken, paymentToken, feeAmount);
    }

    function setPaymentOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle");
        paymentOracle = _oracle;
        emit ConfigUpdate("oracle", uint256(uint160(_oracle)));
    }

    function setFeePercent(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= MAX_FEE_PERCENT, "Fee too high");
        feePercent = _feePercent;
        emit ConfigUpdate("fee", _feePercent);
    }

    function emergencyRecover(
        address token,
        uint256 tokenId,
        uint256 amount,
        address recipient
    ) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        
        if (IERC721(token).supportsInterface(0x80ac58cd)) { // ERC721
            IERC721(token).transferFrom(address(this), recipient, tokenId);
            emit EmergencyRecovery(token, recipient, tokenId, true);
        } else {
            uint256 balance = IERC20(token).balanceOf(address(this));
            uint256 amountToRecover = amount == type(uint256).max ? balance : amount;
            IERC20(token).safeTransfer(recipient, amountToRecover);
            emit EmergencyRecovery(token, recipient, amountToRecover, false);
        }
    }

    function trackToken(address token) internal {
        for (uint256 i = 0; i < trackedTokens.length; i++) {
            if (trackedTokens[i] == token) return;
        }
        trackedTokens.push(token);
    }
}
