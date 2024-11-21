"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

type TokenPriceInfo = {
  priceInEth: bigint;
  purchaseTokens: `0x${string}`[];
  prices: bigint[];
  canBePurchasedInFiat: boolean;
  priceInFiat: bigint;
};

export const TokenSaleWidget = () => {
  const [amount, setAmount] = useState("");
  const [depositToken, setDepositToken] = useState<`0x${string}`>("0x0000000000000000000000000000000000000000"); // Default to ETH

  // Read token price in ETH
  const { data: rawTokenInfo } = useScaffoldReadContract({
    contractName: "TokenSale",
    functionName: "getPrices",
    args: [depositToken || "0x0000000000000000000000000000000000000000"],
  });

  // Transform array response into object
  const tokenInfo: TokenPriceInfo | undefined = rawTokenInfo
    ? {
        priceInEth: rawTokenInfo[0],
        purchaseTokens: rawTokenInfo[1].map((token: string) => token as `0x${string}`), // Map and convert each token
        prices: rawTokenInfo[2].map((price: { toString: () => bigint }) => BigInt(price.toString())), // Convert each price to bigint
        canBePurchasedInFiat: rawTokenInfo[3],
        priceInFiat: rawTokenInfo[4],
      }
    : undefined;

  // Buy tokens with ETH
  const { writeContractAsync: buyToken } = useScaffoldWriteContract("TokenSale");

  const handlePurchase = async () => {
    if (!amount) {
      notification.error("Please enter an amount");
      return;
    }

    try {
      const tokenAmount = parseEther(amount);
      const isEthPurchase = depositToken === "0x0000000000000000000000000000000000000000";

      if (isEthPurchase) {
        const priceInEth = tokenInfo?.priceInEth || 0n;
        const totalPrice = (tokenAmount * priceInEth) / parseEther("1");

        await buyToken({
          functionName: "buyToken",
          args: [depositToken, "0x0000000000000000000000000000000000000000", tokenAmount],
          value: totalPrice,
        });
      } else {
        // For ERC20 purchases
        await buyToken({
          functionName: "buyToken",
          args: [
            depositToken,
            depositToken, // Use the selected token as payment
            tokenAmount,
          ],
          value: 0n, // No ETH value needed for ERC20 purchases
        });
      }

      notification.success("Purchase successful!");
      setAmount("");
    } catch (error) {
      console.error("Error purchasing tokens:", error);
      notification.error(error instanceof Error ? error.message : "Error purchasing tokens");
    }
  };

  const pricePerToken = tokenInfo?.priceInEth ? formatEther(tokenInfo.priceInEth) : "0";
  const totalCost = tokenInfo?.priceInEth ? (parseFloat(amount || "0") * parseFloat(pricePerToken)).toFixed(6) : "0";

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="form-control">
        <label className="label">
          <span className="label-text">Select Payment Token</span>
        </label>
        <select
          className="select select-bordered w-full"
          value={depositToken}
          onChange={e => setDepositToken(e.target.value as `0x${string}`)}
        >
          <option value="0x0000000000000000000000000000000000000000">ETH</option>
          {tokenInfo?.purchaseTokens.map(
            (token, index) =>
              token !== "0x0000000000000000000000000000000000000000" && (
                <option key={token} value={token}>
                  {`ERC20 Token ${index + 1}: ${token}`}
                </option>
              ),
          )}
        </select>
      </div>

      <div className="form-control">
        <label className="label">
          <span className="label-text">Amount of Tokens to Purchase</span>
        </label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.0"
          className="input input-bordered"
          step="0.01"
          min="0"
        />
      </div>

      {!!tokenInfo?.priceInEth && (
        <div className="text-sm text-gray-500">
          <div>Price per Token: {formatEther(tokenInfo?.priceInEth).toString()} ETH</div>
          <div>Total Cost: {totalCost} ETH</div>
          {tokenInfo?.canBePurchasedInFiat && (
            <div>Fiat Price: {formatEther(tokenInfo.priceInFiat).toString()} USD</div>
          )}
        </div>
      )}

      <button className="btn btn-primary w-full" onClick={handlePurchase} disabled={!amount || !tokenInfo?.priceInEth}>
        Purchase Tokens
      </button>
    </div>
  );
};
