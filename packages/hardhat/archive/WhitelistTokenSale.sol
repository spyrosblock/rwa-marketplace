// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./TokenSale.sol";

contract WhitelistTokenSale is TokenSale {
    address[] public whitelistedTokens; // Tokens that can be used in the system (for deposit or purchase)

    // Extend TokenInfo to include whitelisted buyers
    struct WhitelistInfo {
        address[] whitelistedBuyers; // Addresses that can purchase this token
        bool hasWhitelist;
    }

    mapping(address => WhitelistInfo) public whitelistInfo;

    event TokenWhitelisted(address indexed token);
    event TokenRemovedFromWhitelist(address indexed token);
    event BuyerWhitelisted(address indexed depositToken, address indexed buyer);
    event BuyerRemovedFromWhitelist(address indexed depositToken, address indexed buyer);

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
        WhitelistInfo storage wInfo = whitelistInfo[depositToken];
        if (wInfo.whitelistedBuyers.length > 0) {
            bool isWhitelisted = false;
            for (uint256 i = 0; i < wInfo.whitelistedBuyers.length; i++) {
                if (wInfo.whitelistedBuyers[i] == msg.sender) {
                    isWhitelisted = true;
                    break;
                }
            }
            require(isWhitelisted, "Buyer not whitelisted for this token");
        }
        _;
    }

    function isTokenWhitelisted(address token) public view returns (bool) {
        if (whitelistedTokens.length == 0) return true;
        for (uint256 i = 0; i < whitelistedTokens.length; i++) {
            if (whitelistedTokens[i] == token) return true;
        }
        return false;
    }

    function isBuyerWhitelisted(address depositToken, address buyer) public view returns (bool) {
        WhitelistInfo storage wInfo = whitelistInfo[depositToken];
        if (wInfo.whitelistedBuyers.length == 0) return true;
        for (uint256 i = 0; i < wInfo.whitelistedBuyers.length; i++) {
            if (wInfo.whitelistedBuyers[i] == buyer) return true;
        }
        return false;
    }

    function getWhitelistedBuyers(address depositToken) external view returns (address[] memory) {
        return whitelistInfo[depositToken].whitelistedBuyers;
    }

    // Override base functions to add whitelist checks
    function manageDeposit(
        address token,
        uint256 amount,
        address[] calldata acceptedTokens,
        uint256[] calldata prices,
        bool enableFiat,
        uint256 fiatPrice,
        bool isNFT,
        uint256 tokenId
    ) external override nonReentrant whenNotPaused onlyWhitelistedToken(token) {
        for (uint256 i = 0; i < acceptedTokens.length; i++) {
            require(isTokenWhitelisted(acceptedTokens[i]), "Payment token not whitelisted");
        }
        super.manageDeposit(token, amount, acceptedTokens, prices, enableFiat, fiatPrice, isNFT, tokenId);
    }

    function buyToken(
        address depositToken,
        address purchaseToken,
        uint256 amount
    ) external override nonReentrant whenNotPaused onlyWhitelistedToken(purchaseToken) onlyWhitelistedBuyer(depositToken) {
        super.buyToken(depositToken, purchaseToken, amount);
    }

    // Whitelist management functions
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
        whitelistInfo[depositToken].whitelistedBuyers.push(buyer);
        whitelistInfo[depositToken].hasWhitelist = true;
        emit BuyerWhitelisted(depositToken, buyer);
    }

    function removeFromBuyerWhitelist(address depositToken, address buyer) external {
        TokenInfo storage info = depositTokenInfo[depositToken];
        require(info.depositTokenOwner == msg.sender, "Not owner");
        require(isBuyerWhitelisted(depositToken, buyer), "Not whitelisted");
        
        WhitelistInfo storage wInfo = whitelistInfo[depositToken];
        for (uint256 i = 0; i < wInfo.whitelistedBuyers.length; i++) {
            if (wInfo.whitelistedBuyers[i] == buyer) {
                wInfo.whitelistedBuyers[i] = wInfo.whitelistedBuyers[wInfo.whitelistedBuyers.length - 1];
                wInfo.whitelistedBuyers.pop();
                if (wInfo.whitelistedBuyers.length == 0) {
                    wInfo.hasWhitelist = false;
                }
                emit BuyerRemovedFromWhitelist(depositToken, buyer);
                break;
            }
        }
    }
}
