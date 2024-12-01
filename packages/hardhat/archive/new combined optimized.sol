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
    address[] public trackedTokens;
    address[] public whitelistedTokens; // Tokens that can be used in the system (for deposit or purchase)

    struct TokenInfo {
        address depositTokenOwner;
        address[] acceptedTokens;
        address[] whitelistedBuyers; // Addresses that can purchase this token
        mapping(address => uint256) acceptedTokenPrices;
        mapping(address => uint256) tokenBalance;
        uint256 depositTokenBalance;
        bool canBePurchasedInFiat;
        uint256 priceInFiat;
        bool isNFT;
        uint256 tokenId;
        uint256 lastUpdateTime;
    }

    mapping(address => TokenInfo) public depositTokenInfo;
    mapping(address => bool) public isDepositToken;

    event DepositUpdated(
        address indexed token,
        address indexed owner,
        uint256 amount,
        address[] acceptedTokens,
        uint256[] prices,
        bool fiatEnabled,
        uint256 fiatPrice
    );
    event TokenPurchased(
        address indexed buyer,
        address indexed depositToken,
        address indexed purchaseToken,
        uint256 amount,
        uint256 price
    );
    event FiatPurchase(
        address indexed buyer,
        address indexed depositToken,
        uint256 amountReceived
    );
    event TokenWhitelisted(address indexed token);
    event TokenRemovedFromWhitelist(address indexed token);
    event BuyerWhitelisted(address indexed depositToken, address indexed buyer);
    event BuyerRemovedFromWhitelist(address indexed depositToken, address indexed buyer);
    event FeeUpdated(uint256 newFee);
    event EmergencyRecovery(
        address indexed token,
        address indexed recipient,
        uint256 amount,
        bool isNFT
    );
    event FeesCollected(
        address indexed depositToken,
        address[] paymentTokens,
        uint256[] amounts
    );

    modifier onlyWhitelistedToken(address token) {
        if (whitelistedTokens.length > 0) {
            bool isWhitelisted = false;
            for (uint256 i = 0; i < whitelistedTokens.length; i++) {
                if (whitelistedTokens[i] == token) {
                    isWhitelisted = true;
                    break;
                }
            }
            require(isWhitelisted, "Token not whitelisted");
        }
        _;
    }

    modifier onlyWhitelistedBuyer(address depositToken) {
        TokenInfo storage info = depositTokenInfo[depositToken];
        if (info.whitelistedBuyers.length > 0) {
            bool isWhitelisted = false;
            for (uint256 i = 0; i < info.whitelistedBuyers.length; i++) {
                if (info.whitelistedBuyers[i] == msg.sender) {
                    isWhitelisted = true;
                    break;
                }
            }
            require(isWhitelisted, "Buyer not whitelisted for this token");
        }
        _;
    }

    // Getter functions for mappings
    function getAcceptedTokenPrice(address depositToken, address acceptedToken) external view returns (uint256) {
        return depositTokenInfo[depositToken].acceptedTokenPrices[acceptedToken];
    }

    function getTokenBalance(address depositToken, address paymentToken) external view returns (uint256) {
        return depositTokenInfo[depositToken].tokenBalance[paymentToken];
    }

    function getTokenFees(address depositToken, address paymentToken) external view returns (uint256) {
        return tokenFees[depositToken][paymentToken];
    }

    function getAcceptedTokens(address depositToken) external view returns (address[] memory) {
        return depositTokenInfo[depositToken].acceptedTokens;
    }

    function getWhitelistedBuyers(address depositToken) external view returns (address[] memory) {
        return depositTokenInfo[depositToken].whitelistedBuyers;
    }

    function isTokenWhitelisted(address token) public view returns (bool) {
        if (whitelistedTokens.length == 0) return true;
        for (uint256 i = 0; i < whitelistedTokens.length; i++) {
            if (whitelistedTokens[i] == token) return true;
        }
        return false;
    }

    function isBuyerWhitelisted(address depositToken, address buyer) public view returns (bool) {
        TokenInfo storage info = depositTokenInfo[depositToken];
        if (info.whitelistedBuyers.length == 0) return true;
        for (uint256 i = 0; i < info.whitelistedBuyers.length; i++) {
            if (info.whitelistedBuyers[i] == buyer) return true;
        }
        return false;
    }

    // Combined deposit and update function
    function manageDeposit(
        address token,
        uint256 amount,
        address[] calldata acceptedTokens,
        uint256[] calldata prices,
        bool enableFiat,
        uint256 fiatPrice,
        bool isNFT,
        uint256 tokenId
    ) external nonReentrant whenNotPaused onlyWhitelistedToken(token) {
        require(token != address(0), "Invalid token address");
        require(
            acceptedTokens.length == prices.length,
            "Arrays length mismatch"
        );
        require(acceptedTokens.length > 0, "No accepted tokens");

        TokenInfo storage info = depositTokenInfo[token];
        bool isUpdate = isDepositToken[token];

        if (!isUpdate) {
            info.depositTokenOwner = msg.sender;
            info.isNFT = isNFT;
        } else {
            require(info.depositTokenOwner == msg.sender, "Not owner");
        }

        if (amount > 0) {
            if (isNFT) {
                require(amount == 1 && tokenId > 0, "Invalid NFT params");
                IERC721(token).transferFrom(msg.sender, address(this), tokenId);
                info.tokenId = tokenId;
            } else {
                IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
                info.depositTokenBalance += amount;
            }
        }

        info.acceptedTokens = acceptedTokens;
        for (uint256 i = 0; i < acceptedTokens.length; i++) {
            require(isTokenWhitelisted(acceptedTokens[i]), "Payment token not whitelisted");
            info.acceptedTokenPrices[acceptedTokens[i]] = prices[i];
        }

        info.canBePurchasedInFiat = enableFiat;
        info.priceInFiat = fiatPrice;
        info.lastUpdateTime = block.timestamp;

        if (!isUpdate) {
            isDepositToken[token] = true;
            trackToken(token);
        }

        emit DepositUpdated(token, msg.sender, amount, acceptedTokens, prices, enableFiat, fiatPrice);
    }

    function buyToken(
        address depositToken,
        address purchaseToken,
        uint256 amount
    ) external nonReentrant whenNotPaused onlyWhitelistedToken(purchaseToken) onlyWhitelistedBuyer(depositToken) {
        TokenInfo storage info = depositTokenInfo[depositToken];
        require(isDepositToken[depositToken], "Token not for sale");
        require(info.acceptedTokenPrices[purchaseToken] > 0, "Token not accepted");

        uint256 totalPrice = info.acceptedTokenPrices[purchaseToken] * amount;
        uint256 fee = (totalPrice * feePercent) / 100;
        uint256 netPrice = totalPrice - fee;

        IERC20(purchaseToken).safeTransferFrom(msg.sender, address(this), totalPrice);
        
        // Track fees per deposit token and payment token pair
        tokenFees[depositToken][purchaseToken] += fee;
        info.tokenBalance[purchaseToken] += netPrice;

        if (info.isNFT) {
            require(amount == 1, "Invalid NFT amount");
            IERC721(depositToken).transferFrom(address(this), msg.sender, info.tokenId);
            isDepositToken[depositToken] = false;
        } else {
            IERC20(depositToken).safeTransfer(msg.sender, amount);
            info.depositTokenBalance -= amount;
        }

        emit TokenPurchased(msg.sender, depositToken, purchaseToken, amount, totalPrice);
    }

    // Admin functions
    function setFeePercent(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= MAX_FEE_PERCENT, "Fee too high");
        feePercent = newFeePercent;
        emit FeeUpdated(newFeePercent);
    }

    function collectFees(address depositToken) external onlyOwner {
        TokenInfo storage info = depositTokenInfo[depositToken];
        address[] memory paymentTokens = info.acceptedTokens;
        uint256[] memory amounts = new uint256[](paymentTokens.length);
        bool hasFees = false;

        for (uint256 i = 0; i < paymentTokens.length; i++) {
            uint256 feeAmount = tokenFees[depositToken][paymentTokens[i]];
            if (feeAmount > 0) {
                tokenFees[depositToken][paymentTokens[i]] = 0;
                IERC20(paymentTokens[i]).safeTransfer(owner(), feeAmount);
                amounts[i] = feeAmount;
                hasFees = true;
            }
        }

        require(hasFees, "No fees to collect");
        emit FeesCollected(depositToken, paymentTokens, amounts);
    }

    function whitelistToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token");
        require(!isTokenWhitelisted(token), "Already whitelisted");
        whitelistedTokens.push(token);
        emit TokenWhitelisted(token);
    }

    function removeFromWhitelist(address token) external onlyOwner {
        require(isTokenWhitelisted(token), "Not whitelisted");
        for (uint256 i = 0; i < whitelistedTokens.length; i++) {
            if (whitelistedTokens[i] == token) {
                whitelistedTokens[i] = whitelistedTokens[whitelistedTokens.length - 1];
                whitelistedTokens.pop();
                emit TokenRemovedFromWhitelist(token);
                break;
            }
        }
    }

    function whitelistBuyer(address depositToken, address buyer) external {
        TokenInfo storage info = depositTokenInfo[depositToken];
        require(info.depositTokenOwner == msg.sender, "Not owner");
        require(!isBuyerWhitelisted(depositToken, buyer), "Already whitelisted");
        info.whitelistedBuyers.push(buyer);
        emit BuyerWhitelisted(depositToken, buyer);
    }

    function removeFromBuyerWhitelist(address depositToken, address buyer) external {
        TokenInfo storage info = depositTokenInfo[depositToken];
        require(info.depositTokenOwner == msg.sender, "Not owner");
        require(isBuyerWhitelisted(depositToken, buyer), "Not whitelisted");
        
        for (uint256 i = 0; i < info.whitelistedBuyers.length; i++) {
            if (info.whitelistedBuyers[i] == buyer) {
                info.whitelistedBuyers[i] = info.whitelistedBuyers[info.whitelistedBuyers.length - 1];
                info.whitelistedBuyers.pop();
                emit BuyerRemovedFromWhitelist(depositToken, buyer);
                break;
            }
        }
    }

    // Emergency recovery
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

    // Internal helper
    function trackToken(address token) internal {
        for (uint256 i = 0; i < trackedTokens.length; i++) {
            if (trackedTokens[i] == token) return;
        }
        trackedTokens.push(token);
    }
}
