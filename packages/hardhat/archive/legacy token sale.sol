// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenSale is Ownable {
	uint256 public feePercent = 3; // Fee percentage, default is 3%
	mapping(address => uint256) public tokenFees; // Accumulated fees per token
	uint256 public ethFees; // Accumulated ETH fees
	address[] public trackedTokens; // List of tokens with accumulated fees
	address public paymentOracle; // Address of the payment oracle

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
	}

	mapping(address => TokenInfo) public depositTokenInfo;
	mapping(address => bool) public isDepositToken;

	// Events
	event TokenDeposited(
		address indexed depositToken,
		address indexed owner,
		uint256 amount,
		uint256 priceInEth
	);
	event PriceUpdated(
		address indexed depositToken,
		address indexed purchaseToken,
		uint256 newPrice
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
			bool canBePurchasedInFiat, // New return value
			uint256 priceInFiat // New return value
		)
	{
		TokenInfo storage info = depositTokenInfo[depositToken];
		uint256 acceptedTokensCount = info.acceptedTokens.length;

		purchaseTokens = new address[](acceptedTokensCount);
		prices = new uint256[](acceptedTokensCount);

		priceInEth = info.priceInEth;
		canBePurchasedInFiat = info.canBePurchasedInFiat; // Get fiat purchasable
		priceInFiat = info.priceInFiat; // Get fiat price

		for (uint256 i = 0; i < acceptedTokensCount; i++) {
			address token = info.acceptedTokens[i];
			purchaseTokens[i] = token;
			prices[i] = info.acceptedTokenPrices[token];
		}
	}

	// Deposit token function
	function createDeposit(
		address depositToken,
		uint256 amount,
		uint256 priceInEth,
		address[] calldata acceptedTokens,
		uint256[] calldata prices,
		bool canBePurchasedInFiat,
		uint256 priceInFiat
	) external {
		require(depositToken != address(0), "Invalid deposit token address");
		require(amount > 0, "Amount must be greater than zero");
		require(
			acceptedTokens.length == prices.length,
			"Accepted tokens and prices length mismatch"
		);

		TokenInfo storage info = depositTokenInfo[depositToken];
		info.depositTokenOwner = msg.sender;
		info.priceInEth = priceInEth;
		info.acceptedTokens = acceptedTokens;
		info.depositTokenBalance = amount;
		info.canBePurchasedInFiat = canBePurchasedInFiat;
		info.priceInFiat = priceInFiat;
		info.isNFT = false;

		for (uint256 i = 0; i < acceptedTokens.length; i++) {
			info.acceptedTokenPrices[acceptedTokens[i]] = prices[i];
		}

		IERC20(depositToken).transferFrom(msg.sender, address(this), amount);

		isDepositToken[depositToken] = true;
		trackToken(depositToken);

		emit TokenDeposited(depositToken, msg.sender, amount, priceInEth);
	}

	// List NFT for sale
	function listNFTForSale(
		address nftContract,
		uint256 tokenId,
		uint256 priceInEth,
		address[] calldata acceptedTokens,
		uint256[] calldata prices,
		bool canBePurchasedInFiat,
		uint256 priceInFiat
	) external {
		require(nftContract != address(0), "Invalid NFT contract address");
		require(
			acceptedTokens.length == prices.length,
			"Accepted tokens and prices length mismatch"
		);

		// Verify ownership and approval
		require(
			IERC721(nftContract).ownerOf(tokenId) == msg.sender,
			"Not the NFT owner"
		);
		require(
			IERC721(nftContract).getApproved(tokenId) == address(this) ||
				IERC721(nftContract).isApprovedForAll(msg.sender, address(this)),
			"Contract not approved for NFT transfer"
		);

		TokenInfo storage info = depositTokenInfo[nftContract];
		info.depositTokenOwner = msg.sender;
		info.priceInEth = priceInEth;
		info.acceptedTokens = acceptedTokens;
		info.canBePurchasedInFiat = canBePurchasedInFiat;
		info.priceInFiat = priceInFiat;
		info.isNFT = true;
		info.tokenId = tokenId;

		for (uint256 i = 0; i < acceptedTokens.length; i++) {
			info.acceptedTokenPrices[acceptedTokens[i]] = prices[i];
		}

		IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

		isDepositToken[nftContract] = true;
		trackToken(nftContract);

		emit TokenDeposited(nftContract, msg.sender, 1, priceInEth);
	}

	// Update price function
	function updatePrice(
		address depositToken,
		address purchaseToken,
		uint256 newPrice,
		bool canBePurchasedInFiat,
		uint256 newPriceInFiat
	) external {
		TokenInfo storage info = depositTokenInfo[depositToken];
		require(
			msg.sender == info.depositTokenOwner,
			"Only the deposit token owner can update prices"
		);

		require(newPrice >= 0, "New price must be non-negative");

		if (purchaseToken == address(0)) {
			// Update ETH price
			info.priceInEth = newPrice;
		} else {
			// Update ERC-20 token price
			info.acceptedTokenPrices[purchaseToken] = newPrice;

			bool tokenExists = false;
			for (uint256 i = 0; i < info.acceptedTokens.length; i++) {
				if (info.acceptedTokens[i] == purchaseToken) {
					tokenExists = true;
					break;
				}
			}
			if (!tokenExists && newPrice > 0) {
				info.acceptedTokens.push(purchaseToken);
			} else if (newPrice == 0) {
				// Remove the token from acceptedTokens if price is set to 0
				for (uint256 i = 0; i < info.acceptedTokens.length; i++) {
					if (info.acceptedTokens[i] == purchaseToken) {
						info.acceptedTokens[i] = info.acceptedTokens[
							info.acceptedTokens.length - 1
						];
						info.acceptedTokens.pop();
						break;
					}
				}
			}
		}

		info.canBePurchasedInFiat = canBePurchasedInFiat;
		info.priceInFiat = newPriceInFiat;

		emit PriceUpdated(depositToken, purchaseToken, newPrice);
	}

	// Buy token function
	function buyToken(
		address depositToken,
		address purchaseToken,
		uint256 amount
	) public payable {
		TokenInfo storage info = depositTokenInfo[depositToken];
		require(isDepositToken[depositToken], "Token not for sale");
		require(info.isNFT ? amount == 1 : amount > 0, "Invalid amount for token type");

		uint256 price;
		if (purchaseToken == address(0)) {
			price = info.priceInEth;
			require(price > 0, "ETH not accepted for this token");
		} else {
			price = info.acceptedTokenPrices[purchaseToken];
			require(price > 0, "Payment token not accepted");
		}

		uint256 totalPrice = price * amount;
		uint256 fee = (totalPrice * feePercent) / 100;
		uint256 netPrice = totalPrice - fee;

		if (purchaseToken == address(0)) {
			// ETH payment
			require(msg.value == totalPrice, "Incorrect ETH amount sent");
			ethFees += fee;
			info.ethBalance += netPrice;
			info.totalSalesInEth += netPrice;
		} else {
			// ERC20 payment
			IERC20(purchaseToken).transferFrom(
				msg.sender,
				address(this),
				totalPrice
			);
			tokenFees[purchaseToken] += fee;
			info.tokenBalance[purchaseToken] += netPrice;
			info.totalSalesInTokens[purchaseToken] += netPrice;
			trackToken(purchaseToken);
		}

		if (info.isNFT) {
			IERC721(depositToken).transferFrom(address(this), msg.sender, info.tokenId);
			isDepositToken[depositToken] = false; // Remove NFT from sale after purchase
		} else {
			uint256 contractBalance = IERC20(depositToken).balanceOf(address(this));
			require(contractBalance >= amount, "Not enough tokens in contract");
			uint256 sendAmount = amount * 1 ether;
			IERC20(depositToken).transfer(msg.sender, sendAmount);
			info.depositTokenBalance -= sendAmount;
		}

		emit TokenPurchased(
			msg.sender,
			depositToken,
			purchaseToken,
			netPrice,
			amount
		);
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
			isDepositToken[depositToken] = false; // Remove NFT from sale after purchase
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
			newFeePercent >= 0 && newFeePercent <= 100,
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
}