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

	uint256 public constant MAX_FEE_PERCENT = 20; // Maximum fee of 20%
	uint256 public feePercent = 3; // Fee percentage, default is 3%
	mapping(address => uint256) public tokenFees; // Accumulated fees per token
	uint256 public ethFees; // Accumulated ETH fees
	address[] public trackedTokens; // List of tokens with accumulated fees
	address public paymentOracle; // Address of the payment oracle
	uint256 public constant MIN_DEPOSIT_AMOUNT = 1e6; // Minimum deposit amount to prevent dust
	mapping(address => bool) public blockedTokens; // Tokens that are blocked from being deposited
	mapping(address => bool) public whitelistedTokens; // Tokens that are allowed to be deposited
	address[] public whitelistedTokenList; // List of whitelisted tokens

	constructor(address initialOwner, address _paymentOracle) Ownable() {
		transferOwnership(initialOwner);
		paymentOracle = _paymentOracle;
	}

	struct TokenInfo {
		address depositTokenOwner;
		uint256 priceInEth;
		mapping(address => uint256) acceptedTokenPrices;
		address[] acceptedTokens;
		uint256 totalSalesInEth;
		uint256 totalSalesInFiat;
		mapping(address => uint256) totalSalesInTokens;
		uint256 ethBalance; // Balance of ETH sales
		mapping(address => uint256) tokenBalance; // Balance of token sales per purchase token
		uint256 depositTokenBalance;
		bool canBePurchasedInFiat; // Can be purchased with fiat
		uint256 priceInFiat; // Fiat price
		bool isNFT; // Whether this is an NFT listing
		uint256 tokenId; // NFT token ID if this is an NFT listing
		uint256 lastUpdateTime; // Last time the deposit was updated
	}

	mapping(address => TokenInfo) public depositTokenInfo;
	mapping(address => bool) public isDepositToken;

	// Events
	event DepositCreated(
		address indexed token,
		address indexed owner,
		uint256 amount,
		uint256 priceInEth,
		bool isNFT,
		uint256 tokenId
	);
	event DepositUpdated(
		address indexed token,
		address indexed owner,
		uint256 newAmount,
		uint256 newPriceInEth,
		bool fiatUpdated,
		uint256 newPriceInFiat
	);
	event TokenPurchased(
		address indexed buyer,
		address indexed depositToken,
		address indexed purchaseToken,
		uint256 amountPaid,
		uint256 amountReceived
	);
	event FeeUpdated(uint256 newFeePercent);
	event TokensWithdrawn(
		address indexed depositToken,
		address indexed owner,
		uint256 amount
	);
	event DepositRemoved(
		address indexed depositToken,
		address indexed owner,
		uint256 remainingAmount
	);
	event FeesCollected(
		uint256 ethAmount,
		address[] tokenAddresses,
		uint256[] tokenAmounts
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
		string recoveryType
	);
	event TokenWhitelisted(address indexed token);
	event TokenRemovedFromWhitelist(address indexed token);

	// Modifiers
	modifier validDepositToken(address token) {
		require(token != address(0), "Invalid token address");
		require(!blockedTokens[token], "Token is blocked");
		// Only check whitelist if there are whitelisted tokens
		if (whitelistedTokenList.length > 0) {
			require(
				whitelistedTokens[token] || msg.sender == owner(),
				"Token not whitelisted"
			);
		}
		_;
	}

	modifier validPurchaseToken(address token) {
		if (token != address(0)) { // Skip check for ETH payments
			require(token != address(0), "Invalid token address");
			require(!blockedTokens[token], "Token is blocked");
			// Only check whitelist if there are whitelisted tokens
			if (whitelistedTokenList.length > 0) {
				require(whitelistedTokens[token], "Token not whitelisted");
			}
		}
		_;
	}

	modifier validAmount(uint256 amount) {
		require(amount >= MIN_DEPOSIT_AMOUNT, "Amount too small");
		_;
	}

	modifier validDeposit(address depositToken) {
		require(isDepositToken[depositToken], "Token not for sale");
		_;

	}

	// Admin functions
	function blockToken(address token) external onlyOwner {
		if (whitelistedTokens[token]) {
			_removeFromWhitelist(token);
		}
		blockedTokens[token] = true;
	}

	function unblockToken(address token) external onlyOwner {
		blockedTokens[token] = false;
	}

	function whitelistToken(address token) external onlyOwner {
		require(!blockedTokens[token], "Cannot whitelist blocked token");
		if (!whitelistedTokens[token]) {
			whitelistedTokens[token] = true;
			whitelistedTokenList.push(token);
			emit TokenWhitelisted(token);
		}
	}

	function removeFromWhitelist(address token) external onlyOwner {
		_removeFromWhitelist(token);
	}

	// Internal function to remove from whitelist
	function _removeFromWhitelist(address token) internal {
		if (whitelistedTokens[token]) {
			whitelistedTokens[token] = false;
			// Find and remove token from whitelist array
			for (uint256 i = 0; i < whitelistedTokenList.length; i++) {
				if (whitelistedTokenList[i] == token) {
					// Move the last element to the position being deleted
					whitelistedTokenList[i] = whitelistedTokenList[whitelistedTokenList.length - 1];
					// Remove the last element
					whitelistedTokenList.pop();
					break;
				}
			}
			emit TokenRemovedFromWhitelist(token);
		}
	}

	// View function to get all whitelisted tokens
	function getWhitelistedTokens() external view returns (address[] memory) {
		return whitelistedTokenList;
	}

	/**
	 * @dev Creates a new deposit for either an ERC20 token or NFT
	 * @param token The token or NFT contract address
	 * @param amount Amount of tokens to deposit (1 for NFT)
	 * @param priceInEth Price in ETH
	 * @param acceptedTokens Array of accepted payment tokens
	 * @param prices Prices for each accepted token
	 * @param canBePurchasedInFiat Whether token can be purchased with fiat
	 * @param priceInFiat Price in fiat
	 * @param isNFT Whether this is an NFT deposit
	 * @param tokenId Token ID if this is an NFT (0 for ERC20)
	 */
	function createDeposit(
		address token,
		uint256 amount,
		uint256 priceInEth,
		address[] calldata acceptedTokens,
		uint256[] calldata prices,
		bool canBePurchasedInFiat,
		uint256 priceInFiat,
		bool isNFT,
		uint256 tokenId
	) external validDepositToken(token) validAmount(amount) nonReentrant whenNotPaused {
		require(
			acceptedTokens.length == prices.length,
			"Accepted tokens and prices length mismatch"
		);
		require(acceptedTokens.length <= 10, "Too many accepted tokens");
		require(!isDepositToken[token], "Deposit already exists");

		TokenInfo storage info = depositTokenInfo[token];
		// Validate and transfer tokens
		if (isNFT) {
			require(amount == 1, "NFT amount must be 1");
			require(tokenId > 0, "Invalid token ID");
			IERC721(token).transferFrom(msg.sender, address(this), tokenId);
		} else {
			uint256 initialBalance = IERC20(token).balanceOf(address(this));
			IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
			uint256 finalBalance = IERC20(token).balanceOf(address(this));
			require(finalBalance >= initialBalance + amount, "Token transfer failed");
		}

		// Set deposit info
		info.depositTokenOwner = msg.sender;
		info.priceInEth = priceInEth;
		info.acceptedTokens = acceptedTokens;
		info.depositTokenBalance = amount;
		info.canBePurchasedInFiat = canBePurchasedInFiat;
		info.priceInFiat = priceInFiat;
		info.isNFT = isNFT;
		info.tokenId = tokenId;
		info.lastUpdateTime = block.timestamp;

		// Set prices for accepted tokens
		for (uint256 i = 0; i < acceptedTokens.length; i++) {
			if (acceptedTokens[i] != address(0)) { // Skip check for ETH payments
				require(!blockedTokens[acceptedTokens[i]], "Contains blocked token");
				if (whitelistedTokenList.length > 0) {
					require(whitelistedTokens[acceptedTokens[i]], "Contains non-whitelisted token");
				}
			}
			require(prices[i] > 0, "Price must be greater than 0");
			info.acceptedTokenPrices[acceptedTokens[i]] = prices[i];
		}

		isDepositToken[token] = true;
		trackToken(token);

		emit DepositCreated(token, msg.sender, amount, priceInEth, isNFT, tokenId);
	}

	/**
	 * @dev Updates an existing deposit
	 * @param token The token address
	 * @param amount Additional amount to deposit (0 if no change)
	 * @param priceInEth New ETH price (0 if no change)
	 * @param acceptedTokens New accepted tokens (empty if no change)
	 * @param prices New prices for accepted tokens (empty if no change)
	 * @param updateFiatSettings Whether to update fiat settings
	 * @param canBePurchasedInFiat New fiat purchase setting
	 * @param priceInFiat New fiat price
	 */
	function updateDeposit(
		address token,
		uint256 amount,
		uint256 priceInEth,
		address[] calldata acceptedTokens,
		uint256[] calldata prices,
		bool updateFiatSettings,
		bool canBePurchasedInFiat,
		uint256 priceInFiat
	) external nonReentrant whenNotPaused {
		require(isDepositToken[token], "Deposit does not exist");
		TokenInfo storage info = depositTokenInfo[token];
		require(info.depositTokenOwner == msg.sender, "Not deposit owner");

		// Update amount if specified
		if (amount > 0) {
			require(!info.isNFT, "Cannot add amount to NFT");
			uint256 initialBalance = IERC20(token).balanceOf(address(this));
			IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
			uint256 finalBalance = IERC20(token).balanceOf(address(this));
			require(finalBalance >= initialBalance + amount, "Token transfer failed");
			info.depositTokenBalance += amount;
		}

		// Update ETH price if specified
		if (priceInEth > 0) {
			info.priceInEth = priceInEth;
		}

		// Update accepted tokens and prices if specified
		if (acceptedTokens.length > 0) {
			require(
				acceptedTokens.length == prices.length,
				"Tokens and prices length mismatch"
			);
			require(acceptedTokens.length <= 10, "Too many tokens");

			// Clear existing accepted tokens
			delete info.acceptedTokens;

			// Set new accepted tokens and prices
			info.acceptedTokens = acceptedTokens;
			for (uint256 i = 0; i < acceptedTokens.length; i++) {
				if (acceptedTokens[i] != address(0)) {
					require(!blockedTokens[acceptedTokens[i]], "Contains blocked token");
					if (whitelistedTokenList.length > 0) {
						require(
							whitelistedTokens[acceptedTokens[i]],
							"Contains non-whitelisted token"
						);
					}
				}
				require(prices[i] > 0, "Price must be greater than 0");
				info.acceptedTokenPrices[acceptedTokens[i]] = prices[i];
			}
		}

		// Update fiat settings if specified
		if (updateFiatSettings) {
			info.canBePurchasedInFiat = canBePurchasedInFiat;
			info.priceInFiat = priceInFiat;
		}

		info.lastUpdateTime = block.timestamp;

		emit DepositUpdated(
			token,
			msg.sender,
			amount,
			priceInEth,
			updateFiatSettings,
			priceInFiat
		);
	}

	// Main functions with added protections
	function buyToken(
		address depositToken,
		address purchaseToken,
		uint256 amount
	) public payable nonReentrant whenNotPaused validDeposit(depositToken) validPurchaseToken(purchaseToken) {
		TokenInfo storage info = depositTokenInfo[depositToken];
		require(info.isNFT ? amount == 1 : amount > 0, "Invalid amount for token type");
		require(info.lastUpdateTime + 1 hours > block.timestamp, "Deposit too old");

		uint256 price;
		if (purchaseToken == address(0)) {
			price = info.priceInEth;
			require(price > 0, "ETH not accepted for this token");
		} else {
			price = info.acceptedTokenPrices[purchaseToken];
			require(price > 0, "Payment token not accepted");
		}

		uint256 totalPrice = (price * amount);
		uint256 fee = (totalPrice * feePercent) / 100;
		uint256 netPrice = totalPrice - fee;

		if (purchaseToken == address(0)) {
			require(msg.value == totalPrice, "Incorrect ETH amount sent");
			ethFees += fee;
			info.ethBalance += netPrice;
			info.totalSalesInEth += netPrice;
		} else {
			uint256 initialBalance = IERC20(purchaseToken).balanceOf(address(this));
			IERC20(purchaseToken).safeTransferFrom(msg.sender, address(this), totalPrice);
			uint256 finalBalance = IERC20(purchaseToken).balanceOf(address(this));
			require(finalBalance >= initialBalance + totalPrice, "Token transfer failed");

			tokenFees[purchaseToken] += fee;
			info.tokenBalance[purchaseToken] += netPrice;
			info.totalSalesInTokens[purchaseToken] += netPrice;
			trackToken(purchaseToken);
		}

		if (info.isNFT) {
			IERC721(depositToken).transferFrom(address(this), msg.sender, info.tokenId);
			isDepositToken[depositToken] = false;
		} else {
			uint256 contractBalance = IERC20(depositToken).balanceOf(address(this));
			require(contractBalance >= amount, "Not enough tokens in contract");
			IERC20(depositToken).safeTransfer(msg.sender, amount);
			info.depositTokenBalance -= amount;
		}

		emit TokenPurchased(msg.sender, depositToken, purchaseToken, amount, totalPrice);
	}

	function getAllTokens() external view returns (address[] memory) {
		return trackedTokens;
	}

	function getPrices(
		address depositToken
	)
		external
		view
		returns (
			uint256 priceInEth,
			address[] memory purchaseTokens,
			uint256[] memory prices,
			bool canBePurchasedInFiat,
			uint256 priceInFiat
		)
	{
		TokenInfo storage info = depositTokenInfo[depositToken];
		uint256 acceptedTokensCount = info.acceptedTokens.length;

		purchaseTokens = new address[](acceptedTokensCount);
		prices = new uint256[](acceptedTokensCount);

		priceInEth = info.priceInEth;
		canBePurchasedInFiat = info.canBePurchasedInFiat;
		priceInFiat = info.priceInFiat;

		for (uint256 i = 0; i < acceptedTokensCount; i++) {
			address token = info.acceptedTokens[i];
			purchaseTokens[i] = token;
			prices[i] = info.acceptedTokenPrices[token];
		}
	}

	function fiatPurchase(
		address depositToken,
		address buyer,
		uint256 amountPurchased,
		uint256 totalPrice
	) external {
		require(
			msg.sender == paymentOracle,
			"Only the oracle can call this function"
		);
		TokenInfo storage info = depositTokenInfo[depositToken];
		require(isDepositToken[depositToken], "Token not for sale");
		info.totalSalesInFiat += totalPrice;

		if (info.isNFT) {
			IERC721(depositToken).transferFrom(address(this), buyer, info.tokenId);
			isDepositToken[depositToken] = false;
		} else {
			uint256 contractBalance = IERC20(depositToken).balanceOf(address(this));
			require(
				contractBalance >= amountPurchased,
				"Not enough tokens in contract"
			);

			IERC20(depositToken).transfer(buyer, amountPurchased);
			info.depositTokenBalance -= amountPurchased;
		}

		emit FiatPurchase(buyer, depositToken, amountPurchased);
	}

	function trackToken(address tokenToTrack) internal {
		bool tokenTracked = false;
		for (uint256 i = 0; i < trackedTokens.length; i++) {
			if (trackedTokens[i] == tokenToTrack) {
				tokenTracked = true;
				break;
			}
		}
		if (!tokenTracked) {
			trackedTokens.push(tokenToTrack);
		}
	}

	// Set fee percentage
	function setFeePercent(uint256 newFeePercent) external onlyOwner {
		require(
			newFeePercent >= 0 && newFeePercent <= MAX_FEE_PERCENT,
			"Invalid fee percent"
		);
		feePercent = newFeePercent;

		emit FeeUpdated(newFeePercent);
	}

	// Update payment oracle
	function setPaymentOracle(address newOracle) external onlyOwner {
		require(newOracle != address(0), "Invalid oracle address");
		paymentOracle = newOracle;
	}

	// Withdraw tokens and ETH sales proceeds
	function withdrawSalesProceeds(address depositToken) public {
		TokenInfo storage info = depositTokenInfo[depositToken];
		require(msg.sender == info.depositTokenOwner, "Not authorized");

		uint256 ethAmount = info.ethBalance;
		if (ethAmount > 0) {
			payable(msg.sender).transfer(ethAmount);
			info.ethBalance = 0;
			emit TokensWithdrawn(address(0), msg.sender, ethAmount);
		}

		for (uint256 i = 0; i < info.acceptedTokens.length; i++) {
			address token = info.acceptedTokens[i];
			uint256 tokenAmount = info.tokenBalance[token];
			if (tokenAmount > 0) {
				IERC20(token).transfer(msg.sender, tokenAmount);
				info.tokenBalance[token] = 0;
				emit TokensWithdrawn(token, msg.sender, tokenAmount);
			}
		}
	}

	// Remove deposit function
	function removeDeposit(address depositToken) external {
		TokenInfo storage info = depositTokenInfo[depositToken];
		require(
			msg.sender == info.depositTokenOwner || msg.sender == owner(),
			"Not authorized"
		);

		// Withdraw sales proceeds first
		withdrawSalesProceeds(depositToken);

		if (info.isNFT) {
			IERC721(depositToken).transferFrom(address(this), msg.sender, info.tokenId);
		} else {
			uint256 contractBalance = IERC20(depositToken).balanceOf(address(this));
			if (contractBalance > 0) {
				IERC20(depositToken).transfer(msg.sender, contractBalance);
			}
		}

		// Remove the token from sale
		isDepositToken[depositToken] = false;

		emit DepositRemoved(depositToken, msg.sender, info.depositTokenBalance);
	}

	// Collect fees
	function collectFees() external onlyOwner {
		uint256 ethAmount = ethFees;
		ethFees = 0;
		payable(owner()).transfer(ethAmount);

		address[] memory tokens = new address[](trackedTokens.length);
		uint256[] memory amounts = new uint256[](trackedTokens.length);

		for (uint256 i = 0; i < trackedTokens.length; i++) {
			address token = trackedTokens[i];
			uint256 amount = tokenFees[token];
			if (amount > 0) {
				tokenFees[token] = 0;
				tokens[i] = token;
				amounts[i] = amount;
				IERC20(token).transfer(owner(), amount);
			}
		}

		emit FeesCollected(ethAmount, tokens, amounts);
	}

	// Emergency recovery functions
	/**
	 * @dev Emergency function to recover any ERC20 tokens stuck in the contract
	 * @param token The ERC20 token address to recover
	 * @param amount The amount to recover (use type(uint256).max for entire balance)
	 * @param recipient The address to send the recovered tokens to
	 */
	function emergencyRecoverERC20(
		address token,
		uint256 amount,
		address recipient
	) external onlyOwner {
		require(token != address(0), "Invalid token address");
		require(recipient != address(0), "Invalid recipient address");

		uint256 tokenBalance = IERC20(token).balanceOf(address(this));
		uint256 amountToRecover = amount == type(uint256).max ? tokenBalance : amount;
		require(amountToRecover <= tokenBalance, "Insufficient balance");

		// If this is a deposit token, update its balance
		if (isDepositToken[token]) {
			TokenInfo storage info = depositTokenInfo[token];
			require(amountToRecover <= info.depositTokenBalance, "Amount exceeds deposit balance");
			info.depositTokenBalance -= amountToRecover;
			if (info.depositTokenBalance == 0) {
				isDepositToken[token] = false;
			}
		}

		IERC20(token).transfer(recipient, amountToRecover);
		emit EmergencyRecovery(token, recipient, amountToRecover, "ERC20");
	}

	/**
	 * @dev Emergency function to recover any NFT stuck in the contract
	 * @param nftContract The NFT contract address
	 * @param tokenId The token ID to recover
	 * @param recipient The address to send the NFT to
	 */
	function emergencyRecoverNFT(
		address nftContract,
		uint256 tokenId,
		address recipient
	) external onlyOwner {
		require(nftContract != address(0), "Invalid NFT contract address");
		require(recipient != address(0), "Invalid recipient address");
		require(
			IERC721(nftContract).ownerOf(tokenId) == address(this),
			"Contract does not own this NFT"
		);

		// If this is a listed NFT, remove it from listings
		if (isDepositToken[nftContract]) {
			TokenInfo storage info = depositTokenInfo[nftContract];
			if (info.isNFT && info.tokenId == tokenId) {
				isDepositToken[nftContract] = false;
			}
		}

		IERC721(nftContract).transferFrom(address(this), recipient, tokenId);
		emit EmergencyRecovery(nftContract, recipient, tokenId, "NFT");
	}

	/**
	 * @dev Emergency function to recover ETH stuck in the contract
	 * @param amount The amount of ETH to recover (use type(uint256).max for entire balance)
	 * @param recipient The address to send the ETH to
	 */
	function emergencyRecoverETH(
		uint256 amount,
		address payable recipient
	) external onlyOwner {
		require(recipient != address(0), "Invalid recipient address");
		// solhint-disable-next-line not-rely-on-time
		uint256 ethBalance = address(this).balance;
		uint256 amountToRecover = amount == type(uint256).max ? ethBalance : amount;
		require(amountToRecover <= ethBalance, "Insufficient balance");

		recipient.transfer(amountToRecover);
		emit EmergencyRecovery(address(0), recipient, amountToRecover, "ETH");
	}
}
