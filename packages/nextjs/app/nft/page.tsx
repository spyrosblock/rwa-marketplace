"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import LoadingView from "./_components/LoadingView";
import NFTDetails from "./_components/NftDataDisplay";
import { Box, Grid } from "@chakra-ui/react";
import resolveConfig from "tailwindcss/resolveConfig";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { content, theme as tailwindTheme } from "~~/tailwind.config";
import { getData } from "~~/utils/helpers";
import { useAllContracts } from "~~/utils/scaffold-eth/contractsData";
import { useWindowSize } from "~~/utils/windowSize";

/* eslint-disable @next/next/no-img-element */
function NFT() {
  const searchParams = useSearchParams();
  const index = searchParams.get("index");
  const id = searchParams.get("id");
  const _chainId = searchParams.get("chainId");
  const chainId = _chainId ? Number(_chainId) : undefined;
  const { NFTFactory } = useAllContracts(chainId);
  const { address } = useAccount();
  const [data, setData] = useState<any>();
  const [error, setError] = useState<string>();
  const [isLoading, setLoading] = useState<boolean>(true);
  const { width } = useWindowSize();
  const { theme } = resolveConfig({ theme: tailwindTheme, content });
  const isLargeScreen = width > Number(theme.screens.md.substring(0, theme.screens.md.length - 2));
  const isSmallScreen = width < Number(theme.screens.sm.substring(0, theme.screens.sm.length - 2));

  /* prettier-ignore */
  const overrideParameters = chainId
    ? {
      chainId,
      abi: NFTFactory.abi,
      address: NFTFactory.address,
    }
    : {};
  const { data: tokensByAddress = [] } = useScaffoldReadContract({
    contractName: "NFTFactory",
    functionName: "getTokensByAddress",
    args: [address],
  });

  // todo: not getting the index / id think correctly, can only lookup by id
  const NftId = Number(id) || BigInt(tokensByAddress[Number(index)]).toString() || "";

  const { data: tokenURI } = useScaffoldReadContract({
    contractName: "NFTFactory",
    functionName: "tokenURI",
    args: [BigInt(NftId)],
    ...overrideParameters,
  });

  useEffect(() => {
    if (!data && tokenURI) {
      // check tokenURI if it is a string that can be decoded into an object, if not then request
      // TODO: logic is repeated in NftDataDisplay - consolidate
      console.log("tokenURI:", tokenURI);
      let encodedBlockchainData;
      try {
        encodedBlockchainData = JSON.parse(tokenURI);
        console.log("encodedBlockchainData:", encodedBlockchainData);
        setData(encodedBlockchainData);
        setLoading(false);
      } catch (error) {
        getData(tokenURI)
          .catch((error): any => {
            setLoading(false);
            console.log(error);
            setError(`Invalid JSON returned for token #${NftId}:${tokenURI}.`);
          })
          .then(response => {
            setData(response);
            setLoading(false);
          });
      }
    }
  }, [data, tokenURI, NftId, id, index, address]);

  if (isLoading || error)
    return <LoadingView error={error || (isLoading || chainId ? "" : "You may need to connect your wallet to view")} />;

  // FULL SCREEN
  return (
    <Grid w={"100vw"} h={"full"} templateColumns={isLargeScreen ? "45% 1fr" : ""} gap={0}>
      {isLargeScreen ? (
        <Box
          backgroundImage={data?.image || ""}
          backgroundSize={"contain"}
          backgroundPosition={"center"}
          backgroundRepeat={isLargeScreen ? "repeat" : "no-repeat"}
          transition={"background-image 1s ease-in-out"}
          display={"flex"}
          justifyContent={"center"}
          alignItems={"center"}
          borderRadius={isLargeScreen ? 0 : "lg"}
          borderRight={data?.image ? "" : "1px solid #CBCCE0"}
        />
      ) : (
        <div className="indicator relative my-4 mx-auto">
          <img
            alt="NFT Image"
            className="w-72 min-h-72 rounded-lg object-cover z-0"
            src={data?.image}
            style={{
              objectFit: "cover",
            }}
            width="300"
          />
          <span className="indicator-item badge badge-secondary">#{NftId}</span>
        </div>
      )}

      <Box
        w={"full"}
        h={"full"}
        pos="relative"
        overflow={isLargeScreen ? "hidden scroll" : ""}
        pt={isLargeScreen ? 4 : 0}
      >
        <NFTDetails
          metadata={data}
          id={NftId}
          chainId={chainId}
          isSmallScreen={isSmallScreen}
          sideAlign={isLargeScreen}
        />
      </Box>
    </Grid>
  );
}
export default NFT;
