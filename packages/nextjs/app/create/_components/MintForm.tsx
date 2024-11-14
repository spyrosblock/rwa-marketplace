import { useState } from "react";
import { useRouter } from "next/navigation";
import { sanitizeNftAttributes } from "../../../types/Asset";
import { Erc20Data, State } from "../page";
import { Box, Code, Flex, HStack, Stack } from "@chakra-ui/react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Alert, Button, Text } from "~~/components";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldEventHistory, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { singleUpload } from "~~/services/ipfs";
import chainData from "~~/utils/chainData";
import { jsonToStringSafe } from "~~/utils/helpers";

export const MintForm = ({ state }: { state: State }) => {
  const {
    stage,
    setStage,
    asset,
    erc20Data,
  }: {
    stage: any;
    setStage: (arg0: any) => void;
    asset: any;
    erc20Data: Erc20Data;
  } = state;

  const router = useRouter();
  const [mintData, setMintData] = useState<any>({});
  // const [isKyc, setIsKyc] = useState<boolean>(false);
  const [toIpfs, setToIpfs] = useState<boolean>(false);
  const { address } = useAccount();
  const [error, setError] = useState("");
  const [loadingStates, setLoadingStates] = useState<{ token?: boolean; nft?: boolean; amm?: boolean }>({});

  const { data: events = [] } = useScaffoldEventHistory({
    contractName: "NFTFactory",
    eventName: "TokenMinted",
    fromBlock: mintData.blockNumber || 0,
    // watch: true,
    // filters: { greetingSetter: "0x9eB2C4866aAe575bC88d00DE5061d5063a1bb3aF" },
    // blockData: true,
    // transactionData: true,
    // receiptData: true,
  });
  // -events- console.log("mintData & events:", mintData, events);
  // useScaffoldWatchContractEvent({
  //   contractName: "NFTFactory",
  //   eventName: "TokenMinted",
  //   // The onLogs function is called whenever a GreetingChange event is emitted by the contract.
  //   // Parameters emitted by the event can be destructed using the below example
  //   // for this example: event GreetingChange(address greetingSetter, string newGreeting, bool premium, uint256 value);
  //   onLogs: logs => {
  //     console.log("logs", logs);
  //     logs.map(log => {
  //       const { nftId, tokenAddress } = log.args;
  //       console.log("watched log", nftId, tokenAddress);
  //       setMintData({ ...mintData, nftId: BigInt(nftId as bigint).toString(), tokenAddress });
  //     });
  //   },
  // });
  // console.log("mint form data", stage, asset, erc20Data, loadingStates);
  const { writeContractAsync: mintNft } = useScaffoldWriteContract("NFTFactory");
  const handleMint = async () => {
    console.log("minting begun");
    setError("");
    setLoadingStates({ nft: true });
    let tokenUri = "";
    try {
      const preparedNft = sanitizeNftAttributes(asset);
      tokenUri = jsonToStringSafe(preparedNft) || "";
      if (toIpfs) {
        tokenUri = await singleUpload(new File([tokenUri || ""], "metadata.json"));
      }
      await mintNft(
        {
          functionName: "mint",
          args: [
            address,
            tokenUri,
            chainData.emptyAddress,
            [],
            erc20Data.name,
            erc20Data.symbol,
            [address as `0x${string}}`],
            [parseEther(String(erc20Data.supply))],
          ],
        },
        {
          onBlockConfirmation: res => {
            console.log("block confirm", res);
            setMintData({ ...mintData, blockNumber: res.blockNumber, transactionHash: res.transactionHash });
          },
        },
      );
    } catch (error) {
      console.log("nft mint error", error);
      setError(error as string);
      setLoadingStates({});
    }
    console.log("---> TokenURI: ", tokenUri);
    setLoadingStates({});
  };

  const canMint =
    erc20Data.name &&
    erc20Data.symbol &&
    erc20Data.supply &&
    asset.name &&
    asset.description &&
    asset.image &&
    !mintData.blockNumber;

  const inputsMissingMessage = () => {
    let mes = " \nInputs missing: ";
    mes = asset.name ? mes : mes + "asset name, ";
    mes = asset.description ? mes : mes + "asset description, ";
    mes = asset.image ? mes : mes + "asset image, ";
    asset.attributes.map(
      (attr: any) => (mes = attr.required ? (attr.value ? mes : mes + `${attr.trait_type}, `) : mes),
    );

    mes = erc20Data.name ? mes : mes + "erc20 name, ";
    mes = erc20Data.symbol ? mes : mes + "erc20 symbol, ";
    mes = erc20Data.supply ? mes : mes + "erc20 supply, ";
    mes = mes.slice(0, mes.length - 2) + ".";

    return mes;
  };

  return (
    <Stack pl={2} pr={4} gap={4}>
      <div>
        <Text size={"xl"} display={"block"} bold>
          NFT
        </Text>
        <Code p={3} w={"100%"}>
          <span className="font-bold">name</span>: {asset.name}
          <br></br>
          <span className="line-clamp-3">
            <span className="font-bold">description</span>: {asset.description}
          </span>
          <span className="font-bold">image:</span> {asset.image}
          <br></br>
          <span className="font-bold">attributes</span>:
          <Box pl={4}>
            {sanitizeNftAttributes(asset).attributes.map((attr: any, i: any) => (
              <Text display={"block"} key={i}>
                <span className="font-bold">{attr.trait_type}</span>: {attr.value}
              </Text>
            ))}
          </Box>
        </Code>
      </div>
      <div>
        <Text size={"xl"} display={"block"} bold>
          Liquid Token
        </Text>
        <Code p={3}>
          <span className="font-bold">name</span>: {erc20Data.name}
          <br></br>
          <span className="font-bold">symbol</span>: {erc20Data.symbol}
          <br></br>
          <span className="font-bold">supply</span>: {erc20Data.supply}
          <br></br>
        </Code>
      </div>
      {/* <div className="flex items-center space-2">
        <input
          type="checkbox"
          defaultChecked
          className="checkbox checkbox-md mr-2"
          checked={isKyc}
          onChange={() => setIsKyc(!isKyc)}
        />{" "}
        Require KYC
      </div> */}
      <div className="flex items-center space-2">
        <input
          type="checkbox"
          className="checkbox checkbox-md mr-2"
          checked={toIpfs}
          onChange={() => setToIpfs(!toIpfs)}
        />{" "}
        Upload to IPFS
      </div>
      {!canMint && !mintData.blockNumber ? (
        <Alert type="warning" message={"Insufficient data for mint." + inputsMissingMessage()} />
      ) : (
        <Text tiny>
          When you press mint below you will be creating both an NFT and a ERC20 Token that represents the underlying
          asset. Enjoy responsibly fren :)
        </Text>
      )}
      {canMint && (
        <>
          <div className="flex flex-col items-center mt-2 space-x-2">
            <Button
              pointerEvents={loadingStates.nft ? "none" : "auto"}
              isLoading={loadingStates.nft}
              loadingText="Minting"
              colorScheme="teal"
              width={"full"}
              onClick={handleMint}
            >
              Mint
            </Button>
          </div>
        </>
      )}
      {!loadingStates.nft && mintData.blockNumber && events[0]?.args?.tokenAddress && (
        <div className="flex mt-2">
          🥳 ERC20 adress:&nbsp;&nbsp;
          <Address address={events[0]?.args?.tokenAddress} disableAddressLink={true} format="short" size="sm" />
        </div>
      )}

      {error && <Alert type="error" message={error.toString ? error.toString() : error} />}
      {!address && <Alert type="error" message="Connect wallet in order to be enable mint" />}
      <HStack>
        <Box width={"50%"}>
          <Button width={"full"} onClick={() => setStage(stage - 1)}>
            <Flex width={"full"} justifyContent={"space-between"} alignItems={"center"}>
              <ChevronLeftIcon width="20" /> Back{" "}
              <ChevronRightIcon opacity={0} width={20} className="justify-self-end" />
            </Flex>
          </Button>
        </Box>
        <Box width={"50%"}>
          <Button
            width={"full"}
            colorScheme={"teal"}
            isDisabled={!mintData.blockNumber}
            onClick={() => {
              router.push(`/nft?id=${BigInt(events[0].args.nftId as bigint).toString()}`);
            }}
          >
            <Flex width={"full"} justifyContent={"space-between"} alignItems={"center"}>
              <ChevronLeftIcon opacity={0} width="20" /> View NFT{" "}
              <ChevronRightIcon width={20} className="justify-self-end" />
            </Flex>
          </Button>
        </Box>
      </HStack>
    </Stack>
  );
};
