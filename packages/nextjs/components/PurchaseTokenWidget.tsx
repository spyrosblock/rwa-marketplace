"use client";

import { useState } from "react";
// import PayWithCoinbaseButton from './BuyButton';
import { Checkbox, Flex } from "@chakra-ui/react";
import { useAccount } from "wagmi";
import { Button, Input, Text } from "~~/components";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { format } from "~~/utils/helpers";
import { useAllContracts } from "~~/utils/scaffold-eth/contractsData";

// import { useTargetNetwork } from '~~/hooks/scaffold-eth/useTargetNetwork';
// import { getBlockExplorerAddressLink } from '~~/utils/scaffold-eth';
// import constants from '~~/utils/scaffold-eth/chainData';
// import chainData from '~~/utils/scaffold-eth/chainData';

/* eslint-disable @next/next/no-img-element */
function DepositDisplay({
  depositAddress,
  chainId,
  className,
}: {
  depositAddress: string;
  chainId?: number;
  className?: string;
}) {
  const { address } = useAccount();
  const { TokenSale } = useAllContracts(chainId);
  const [selectedCheckbox, setCheckbox] = useState<string>();
  const [listTokenAmount, setListTokenAmount] = useState<number>(0);
  const [priceInEth, setPriceInEth] = useState<number>(0);
  const [acceptedToken, setAcceptedToken] = useState<string>("");
  const [tokenPrice, setTokenPrice] = useState<number>(0);
  const [allowPurchasedInFiat, setAllowPurchasedInFiat] = useState<boolean>(false);
  const [salePriceInFiat, setSalePriceInFiat] = useState<number>(0);
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

  const { writeContractAsync: createDeposit } = useScaffoldWriteContract("TokenSale");

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

  // TODO: seems redundant, just get prices from depositTokenInfo,
  // but keeping for now so don't have to do major refactor yet
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
  console.log("depositTokenAmount:", depositTokenAmount);

  return (
    <div className={`stats ${className}`}>
      <div className="stat inline">
        <Flex direction="column" height="100%" justifyContent="space-between">
          <Text size="sm">
            <div className="stat-title flex items-center">
              🪙 <Address disableAvatar address={depositAddress} format="short" size="sm" />
            </div>
          </Text>
          <div className="stat-value">${depositTokenSymbol}</div>
          <div className="block">{depositTokenName}</div>
          {depositTokenAmount ? (
            <div>
              <Text bold>Available: {format(depositTokenAmount, { from18: true })}</Text>
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
                  </Flex>
                )}
              </div>
            </div>
          ) : (
            <div>
              <Text bold className="mt-2">
                Liquid tokens for this NFT not for sale at this time, would you like to list some for sale?
              </Text>
              <div className="space-y-4">
                <Input label="Amount" type="number" onChange={e => setListTokenAmount(Number(e.target.value))} />
                <Input label="ETH Price" type="number" onChange={e => setPriceInEth(Number(e.target.value))} />
                <Input label="Accepted Token Address" onChange={e => setAcceptedToken(e.target.value)} />
                <Input label="Token Price" type="number" onChange={e => setTokenPrice(Number(e.target.value))} />
                <Checkbox onChange={e => setAllowPurchasedInFiat(e.target.checked)}>Allow Fiat Purchase</Checkbox>
                {allowPurchasedInFiat && (
                  <Input label="Fiat Price" type="number" onChange={e => setSalePriceInFiat(Number(e.target.value))} />
                )}
                <Button
                  width={"full"}
                  isDisabled={!listTokenAmount || !priceInEth}
                  onClick={() => {
                    createDeposit?.({
                      args: [
                        depositAddress,
                        BigInt(listTokenAmount),
                        BigInt(Math.floor(priceInEth * 1e18)),
                        [acceptedToken],
                        [BigInt(Math.floor(tokenPrice * 1e18))],
                        allowPurchasedInFiat,
                        BigInt(Math.floor(salePriceInFiat * 1e18)),
                      ],
                    });
                  }}
                >
                  Create Deposit
                </Button>
              </div>
            </div>
          )}
        </Flex>
      </div>
    </div>
  );
}

export default DepositDisplay;
