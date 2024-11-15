"use client";

import { ReactElement, useEffect, useRef, useState } from "react";
import Link from "next/link";
import LoadingView from "./LoadingView";
import Metadata from "./Metadata";
import { Box, Code, Flex, Grid, GridItem } from "@chakra-ui/react";
import axios from "axios";
import { isObject } from "lodash";
import { useAccount, useToken } from "wagmi";
import {
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  CodeBracketIcon,
  DocumentIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { Accordian, Button, Text } from "~~/components";
import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
// import { useScaffoldContractRead, useScaffoldContractWrite } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import chainData from "~~/utils/chainData";
import { format, getAttribute } from "~~/utils/helpers";
import { getBlockExplorerAddressLink } from "~~/utils/scaffold-eth";
import { useAllContracts } from "~~/utils/scaffold-eth/contractsData";

/* eslint-disable @next/next/no-img-element */
function NFTDetails({
  id,
  chainId,
  isSmallScreen,
  sideAlign,
  metadata,
}: {
  id: string | number;
  chainId?: number;
  isSmallScreen: boolean;
  sideAlign: boolean;
  metadata?: object;
}) {
  const { address } = useAccount();
  const { NFTFactory } = useAllContracts(chainId);
  const { targetNetwork } = useTargetNetwork();
  const [data, setData] = useState<any>(metadata);
  const [lineClamp, setLineClamp] = useState<boolean>(true);
  const [error, setError] = useState<string>();
  const [input, setInput] = useState<string>();
  const [isLoading, setLoading] = useState<boolean>(metadata ? false : true);
  const [isTransfer, setTransfer] = useState<boolean>();
  const [isTokenUri, setTokenUri] = useState<boolean>();
  const transferInput = useRef<HTMLInputElement>(null);
  const bigIntId = BigInt(id);

  const toggleLineClamp = () => {
    setLineClamp(!lineClamp);
  };

  const PDFAttribute = getAttribute(chainData.linkedPdfKey, data?.attributes);
  const PoolAttribute = getAttribute(chainData.linkedPoolKey, data?.attributes);
  const selectedChainId = chainId || targetNetwork?.id;
  /* prettier-ignore */
  const overrideParameters = chainId
    ? {
      chainId,
      abi: NFTFactory?.abi,
      address: NFTFactory?.address,
    }
    : {};

  // const { writeAsync: writeTokenURI } = useScaffoldContractWrite({
  //   contractName: "NFTFactory",
  //   functionName: "setTokenURI",
  // });
  // const { writeAsync: writeTransfer } = useScaffoldContractWrite({
  //   contractName: "NFTFactory",
  //   functionName: "safeTransferFrom",
  //   ...overrideParameters,
  // });

  const tokenURI = useScaffoldReadContract({
    contractName: "NFTFactory",
    functionName: "tokenURI",
    args: [bigIntId],
    ...overrideParameters,
  }).data;

  const [status, linkedTokenAddress, , isLocked] =
    useScaffoldReadContract({
      contractName: "NFTFactory",
      functionName: "nftData",
      args: [bigIntId],
      ...overrideParameters,
    }).data || [];

  const owner = useScaffoldReadContract({
    contractName: "NFTFactory",
    functionName: "ownerOf",
    args: [bigIntId],
    ...overrideParameters,
  }).data;

  const { data: linkedTokenData } = useToken({
    address: linkedTokenAddress,
    chainId: selectedChainId,
  });

  const isOwner = owner === address;
  const blockExplorerLinkedToken = getBlockExplorerAddressLink(
    chainData[selectedChainId],
    linkedTokenAddress as string,
  );
  const blockExplorerFactoryLink = getBlockExplorerAddressLink(chainData[selectedChainId], NFTFactory?.address);

  const getData = async (url: string) => {
    const response = await axios.get(url).catch(error => {
      console.log(error);
      setError("HTTP Request Error");
      throw "HTTP Request Error";
    });
    const data = response?.data;
    if (isObject(data)) {
      return data;
    } else {
      console.log("error:", response);
      throw "Data Improperly Formated Error:" + url;
    }
  };
  const setTokenURI = async () => {
    if (!isTokenUri) {
      setTokenUri(true);
    } else if (input) {
      // TODO: refactor to updateNFT
      // await writeTokenURI({ args: [id, input] });
      // setError("Reload the page to see updates");
      // setTokenUri(false);
    } else {
      setTokenUri(false);
    }
  };
  const handleTransfer = () => {
    if (isTransfer && transferInput.current?.value) {
      // TODO: update to new scaffold write
      // writeTransfer({ args: [address, transferInput.current?.value, id] }).then(() => {
      //   setTransfer(false);
      // });
    } else if (!isTransfer) {
      setTransfer(true);
    } else {
      setTransfer(false);
    }
  };

  useEffect(() => {
    if (!data && tokenURI) {
      // check tokenURI if it is a string that can be decoded into an object
      // if not then request
      let encodedBlockchainData;
      try {
        encodedBlockchainData = JSON.parse(tokenURI);
        setData(encodedBlockchainData);
        setLoading(false);
      } catch (error) {
        getData(tokenURI)
          .catch((error): any => {
            setLoading(false);
            console.log(error);
            setError(`Invalid JSON returned for token #${Number(id)}:${tokenURI}.`);
          })
          .then(response => {
            setData(response);
            setLoading(false);
          });
      }
    }
  }, [data, tokenURI, id]);

  if (isLoading || error) return <LoadingView error={error || ""} />;

  const details = [
    {
      label: "NFT Data",
      children: [
        {
          label: "ID",
          value: BigInt(id).toString(),
        },
        {
          label: "Address",
          value: NFTFactory?.address,
          type: "address",
        },
        {
          label: "Network",
          value: selectedChainId + `(${chainData[selectedChainId]?.name})`,
        },
        {
          label: "Status",
          value: status,
        },
        {
          label: "Locked",
          value: isLocked?.toString(),
        },
      ],
    },
    {
      hide: !linkedTokenData,
      label: "Liquid Token",
      children: [
        {
          label: "Address",
          value: linkedTokenData?.address,
          type: "address",
        },
        {
          label: "Name",
          value: linkedTokenData?.name,
        },
        {
          label: "Symbol",
          value: linkedTokenData?.symbol,
        },
        {
          label: "Supply",
          value: format(linkedTokenData?.totalSupply.formatted),
        },
      ],
    },
    {
      hide: !PoolAttribute,
      label: "AMM Pool",
      children: [
        {
          label: "Address",
          value: PoolAttribute?.value,
          type: "address",
        },
        {
          label: "Platform",
          value: "Uniswap",
        },
      ],
    },
  ];
  const links = [
    {
      hide: true,
      href: `/defi/?token=${linkedTokenAddress}`,
      icon: <BanknotesIcon width="20px" />,
      children: "Liquidity",
    },
    {
      href: blockExplorerLinkedToken,
      external: true,
      icon: <ArrowTopRightOnSquareIcon width="15px" />,
      children: "Token",
    },
    {
      href: blockExplorerFactoryLink,
      external: true,
      icon: <ArrowTopRightOnSquareIcon width="15px" />,
      children: "NFT Factory",
    },
    {
      href: data?.external_url,
      external: true,
      icon: <ArrowTopRightOnSquareIcon width="15px" />,
      children: "Context",
    },
  ].filter(link => link.href && !link.hide);
  const ActionItem = ({
    href,
    children,
    external,
    icon,
  }: {
    href: string;
    children: any;
    external?: boolean;
    icon: ReactElement;
  }) => {
    return (
      <Box
        as={Link}
        target={external ? "_blank" : "_self"}
        href={href}
        width={isSmallScreen ? "50%" : 100 / links.length + `%`}
        className={`p-1 `}
      >
        <Button opacity=".75" colorScheme="blue" size={"sm"} className="transition-none w-full" rightIcon={icon}>
          {children}
        </Button>
      </Box>
    );
  };

  return (
    <Box p={4} pb={sideAlign ? 4 : 12} /* makes room for theme switch at the bottom */>
      <div className={`flex flex-col justify-center mb-4 ${sideAlign ? "text-left" : "text-center"}`}>
        <Text size="xl" bold mb={1}>
          {data?.name}
        </Text>
        <Text noOfLines={lineClamp ? 6 : undefined} onClick={toggleLineClamp} mb={4}>
          {data?.description}
        </Text>
        <Code p={4} className="space-y-4" bg={"var(--chakra-colors-chakra-body-bg)"}>
          {details.map(({ label, children, hide }) => {
            if (hide) return null;
            return (
              <Text size="xs" key={label} display={"block"} align={"left"}>
                <Text bold size="xs">
                  {label}
                </Text>
                {children.map(({ label, value, type }) => (
                  <Text size="xs" key={label} className="flex items-center pl-2">
                    {label}: {type === "address" ? <Address size="xs" disableAvatar address={value} /> : value}
                  </Text>
                ))}
              </Text>
            );
          })}
        </Code>
      </div>
      <Box mb={3} className="space-y-2">
        {/* VIEW PDF */}
        {PDFAttribute && (
          <Accordian
            title={
              <>
                PDF&nbsp;
                <DocumentIcon width="22px" />
              </>
            }
          >
            <embed src={PDFAttribute.value} width="100%" height="500px" />
          </Accordian>
        )}
        {/* PURCHASE - UNISWAP WIDGET NOT WORKING ATM as expected */}
        {/* {isOwner && linkedTokenData && (
          <Accordian
            title={
              <>
                PURCHASE &nbsp;&nbsp;
                <CurrencyPoundIcon width="20px" />
              </>
            }
          >
            <Text tiny>if token dropdowns appear blank, copy these addresses to paste when selecting a token:</Text>
            <iframe
              src={`https://app.uniswap.org/swap?inputCurrency=${STABLE.address}&outputCurrency=${linkedTokenData.address}`}
              // src={`https://app.uniswap.org/swap?exactField=input&exactAmount=10&inputCurrency=${STABLE.address}&use=v3&theme=light`}
              height="600px"
              width="100%"
            />
          </Accordian>
        )} */}
        {!isSmallScreen && isOwner && (
          <Accordian
            title={
              <>
                METADATA&nbsp;&nbsp;
                <CodeBracketIcon width="25px" />
              </>
            }
          >
            <Metadata json={data} tokenId={id} />
          </Accordian>
        )}
      </Box>
      {/* OWNER ACTIONS */}
      {isOwner && (
        <Grid templateColumns="repeat(2, 1fr)">
          <GridItem colSpan={isTransfer ? 2 : 1} p={1}>
            {/* TRANSFER */}
            <Flex className={`${isTransfer ? "join" : ""} self-center`}>
              {isTransfer && (
                <input
                  ref={transferInput}
                  className="input input-bordered join-item w-full input-sm"
                  placeholder="Address 0x1234"
                />
              )}
              <Button
                size="sm"
                colorScheme="teal"
                variant={"outline"}
                onClick={handleTransfer}
                className={`join-item ${isTransfer ? "" : "w-full"}`}
                rightIcon={<PaperAirplaneIcon width="15px" />}
              >
                Transfer
              </Button>
            </Flex>
          </GridItem>
          <GridItem colSpan={isTokenUri ? 2 : 1} p={1}>
            {/* SET URI */}
            <Flex className={`${isTokenUri ? "join" : ""} self-center`}>
              {isTokenUri && (
                <input
                  ref={transferInput}
                  onChange={e => setInput(e?.target?.value)}
                  className="input input-bordered join-item input-sm w-full"
                  placeholder="IPFS Hash"
                />
              )}
              <Button
                size="sm"
                colorScheme="teal"
                variant={"outline"}
                onClick={setTokenURI}
                rightIcon={<PencilSquareIcon width="15px" />}
                className={`join-item ${isTokenUri ? "" : "w-full"}`}
              >
                Set URI
              </Button>
            </Flex>
          </GridItem>
        </Grid>
      )}
      {/* BOTTOM ROW */}
      <Flex justifyContent={"center"} wrap="wrap">
        {links.map((props, i) => (
          <ActionItem {...props} key={i} />
        ))}
      </Flex>
    </Box>
  );
}

export default NFTDetails;
