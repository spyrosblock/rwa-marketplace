"use client";

import { useState } from "react";
// import PayWithCoinbaseButton from './BuyButton';
import { Flex } from "@chakra-ui/react";
import { useAccount } from "wagmi";
import { Text } from "~~/components";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { format } from "~~/utils/helpers";
import { useAllContracts } from "~~/utils/scaffold-eth/contractsData";

// import { useTargetNetwork } from '~~/hooks/scaffold-eth/useTargetNetwork';
// import { getBlockExplorerAddressLink } from '~~/utils/scaffold-eth';
// import constants from '~~/utils/scaffold-eth/chainData';
// import chainData from '~~/utils/scaffold-eth/chainData';

/* eslint-disable @next/next/no-img-element */
function DepositDisplay({ depositAddress, chainId }: { depositAddress: string; chainId?: number }) {
  const { address } = useAccount();
  const { TokenSale } = useAllContracts(chainId);
  const [selectedCheckbox, setCheckbox] = useState<string>();
  //   const [selectedAmount, setSelectedAmount] = useState<number>(0);
  // const { targetNetwork } = useTargetNetwork();
  // const transferInput = useRef<HTMLInputElement>(null);
  // const selectedChainId = chainId || targetNetwork?.id;
  // const blockExplorerLinkedToken = getBlockExplorerAddressLink(chainData[selectedChainId], linkedTokenAttribute?.value);
  // const blockExplorerFactoryLink = getBlockExplorerAddressLink(chainData[selectedChainId], ERC20Factory?.address);
  /* prettier-ignore */

  const depositOverride = {
    address: depositAddress,
  };

  // const { writeAsync: writeTokenURI } = useScaffoldContractWrite({
  //   contractName: 'ERC20Factory',
  //   functionName: 'getPrices',
  // });
  // const { writeAsync: writeTransfer } = useScaffoldContractWrite({
  //   contractName: 'ERC20Factory',
  //   functionName: 'safeTransferFrom',
  //   ...overrideParameters,
  // });

  const depositTokenSymbol = useScaffoldReadContract({
    contractName: "ERC20Ownable",
    functionName: "symbol",
    ...depositOverride,
  }).data;
  const depositTokenName = useScaffoldReadContract({
    contractName: "ERC20Ownable",
    functionName: "name",
    ...depositOverride,
  }).data;

  const depositTokenAmount = useScaffoldReadContract({
    contractName: "ERC20Ownable",
    functionName: "balanceOf",
    args: [TokenSale.address],
    ...depositOverride,
  }).data;

  const factoryOwner = useScaffoldReadContract({
    contractName: "ERC20Factory",
    functionName: "owner",
  }).data;

  const depositTokenInfo_ =
    useScaffoldReadContract({
      contractName: "TokenSale",
      functionName: "depositTokenInfo",
      args: [depositAddress],
    }).data || [];

  console.log("depositTokenInfo_:", depositTokenInfo_, depositAddress);

  const prices_ =
    useScaffoldReadContract({
      contractName: "TokenSale",
      functionName: "getPrices",
      args: [depositAddress],
    }).data || [];

  const [
    depositTokenOwner,
    ,
    ,
    ,
    ,
    ,
    // priceInEth,
    // totalSalesInEth,
    // totalSalesInFiat,
    // ethBalance,
    // depositTokenBalance,
    canBePurchasedInFiat,
    priceInFiat,
  ] = depositTokenInfo_;

  const [_ethPrice, purchaseTokens, purchasePrices] = prices_;
  const ethPrice = format(_ethPrice, { from18: true }) || _ethPrice;

  const isDepositOwner = address === depositTokenOwner;
  const isFactoryOwner = factoryOwner === address;

  console.log("owner", isFactoryOwner, isDepositOwner);
  console.log("prices:", prices_, depositAddress);
  console.log("canBePurchasedInFiat:", canBePurchasedInFiat, priceInFiat);

  return (
    <div>
      <div className="stats">
        <div className="stat inline">
          <Flex direction="column" height="100%" justifyContent="space-between">
            <div>
              <Text size="sm">
                <div className="stat-title flex items-center">
                  🪙 <Address disableAvatar address={depositAddress} format="short" size="sm" />
                </div>
              </Text>
              <div className="stat-value">{depositTokenSymbol}</div>
              <div className="block">{depositTokenName}</div>
              <Text bold>Available: {format(depositTokenAmount, { from18: true })}</Text>
            </div>
            <div className="divider divider-start">Purchase</div>
            <div className="space-y-1">
              {ethPrice && (
                <Flex direction="row">
                  <input
                    type="checkbox"
                    checked={selectedCheckbox === "eth"}
                    onChange={() => setCheckbox("eth")}
                    className="checkbox checkbox-sm mr-1"
                  />
                  <Text className="block">
                    <Text bold>{format(ethPrice, { from18: true })}</Text> : ETH
                  </Text>
                </Flex>
              )}
              {purchaseTokens?.map((address: string | undefined, i: number) => (
                <Flex key={address} direction="row">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm mr-1"
                    checked={selectedCheckbox === address}
                    onChange={() => setCheckbox(address)}
                  />
                  <Text className="block">
                    <Flex>
                      <Text bold className="mr-1">
                        {format(purchasePrices?.[i], { from18: true })}
                      </Text>{" "}
                      :
                      <Address disableAvatar address={address} format="short" size="sm" />
                    </Flex>
                  </Text>
                </Flex>
              ))}
              {canBePurchasedInFiat && (
                <Flex direction="row">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-sm mr-1"
                    onChange={() => setCheckbox("fiat")}
                    checked={selectedCheckbox === "fiat"}
                  />
                  <Text className="block">
                    <Text bold>{format(priceInFiat)}</Text> : USD ($)
                  </Text>
                </Flex>
              )}
            </div>
            <div className="stat-actions flex flex-row items-center">
              {/* <Input
                placeholder="Quantity"
                className={'w-24 mr-2'}
                type="number"
                onChange={e => setSelectedAmount(e.target.value)}
              /> */}
              {/* {selectedCheckbox === 'fiat' ? (
                <PayWithCoinbaseButton
                  sendAddress={address as string}
                  amount={selectedAmount}
                  depositAddress={depositAddress}
                  fiatPrice={priceInFiat}
                  disabled={!selectedCheckbox || !selectedAmount}
                />
              ) : (
                <button className={`${selectedCheckbox ? '' : 'btn-disabled'} btn btn-sm btn-primary`}>
                  Buy with Crypto
                </button>
              )} */}
            </div>
            {isDepositOwner && (
              <div>
                <div className="divider divider-start">Admin</div>
                <div className="stat-actions space-x-2">
                  <button className="btn btn-sm btn-success">Add funds</button>
                  <button className="btn btn-sm">Remove funds</button>
                </div>
              </div>
            )}
          </Flex>
        </div>
      </div>
    </div>
  );
}

export default DepositDisplay;
