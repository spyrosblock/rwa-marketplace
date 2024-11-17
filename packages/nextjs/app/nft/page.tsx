"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import LoadingView from "./_components/LoadingView";
import NFTDetails from "./_components/NftDataDisplay";
import { Box, Grid } from "@chakra-ui/react";
import resolveConfig from "tailwindcss/resolveConfig";
import { useAccount } from "wagmi";
import { DocumentIcon } from "@heroicons/react/24/outline";
import { Accordion, PageWrapper, Text } from "~~/components";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import useGlobalState from "~~/services/store/globalState";
import { content, theme as tailwindTheme } from "~~/tailwind.config";
import chainData from "~~/utils/chainData";
import { fetchNftData, getAttribute } from "~~/utils/helpers";
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
  const [data, setData] = useGlobalState<any>("currentNft");
  const [error, setError] = useState<string>();
  const [isLoading, setLoading] = useState<boolean>(true);
  const { width } = useWindowSize();
  const { theme } = resolveConfig({ theme: tailwindTheme, content });
  const isLargeScreen = width > Number(theme.screens.md.substring(0, theme.screens.md.length - 2));
  const isSmallScreen = width < Number(theme.screens.sm.substring(0, theme.screens.sm.length - 2));
  const PDFAttribute = getAttribute(chainData.linkedPdfKey, data?.attributes);

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

  const NftId = id || BigInt(tokensByAddress[Number(index)]).toString() || "";

  const { data: tokenURI } = useScaffoldReadContract({
    contractName: "NFTFactory",
    functionName: "tokenURI",
    args: [BigInt(NftId)],
    ...overrideParameters,
  });

  // TODO: find out why after initial loads tokenURI reverts back to undefined

  useEffect(() => {
    if (!data && tokenURI) {
      console.log("fetching");
      fetchNftData(tokenURI)
        .catch(() => {
          setLoading(false);
          setError(`Invalid JSON returned for token #${Number(id)}:${tokenURI}.`);
        })
        .then(response => {
          setData(response);
          setLoading(false);
        });
    }
  }, [data, tokenURI, id, setData, setLoading]);

  if (isLoading || error)
    return <LoadingView error={error || (isLoading || chainId ? "" : "You may need to connect your wallet to view")} />;

  // FULL SCREEN
  return (
    <PageWrapper align="left">
      <Text size="xl" bold align={"left"} mb="4">
        {data.name}
      </Text>
      <Grid h={"fit-content"} templateColumns={isLargeScreen ? "50% 1fr" : ""} gap={4} mb="4">
        <Box flex={1}>
          <img alt="NFT Image" className="rounded-lg object-cover z-0" src={data?.image} />
        </Box>
        <Box w={"full"} h={"full"} pos="relative" overflow={isLargeScreen ? "hidden scroll" : ""}>
          <NFTDetails
            metadata={data}
            id={NftId}
            chainId={chainId}
            isSmallScreen={isSmallScreen}
            sideAlign={isLargeScreen}
          />
        </Box>
      </Grid>
      {PDFAttribute && (
        <Box display={"flex"} justifyContent={"center"} mt={4}>
          <Accordion
            open
            // className="bg-base-200 max-w-[911px]"
            className="bg-base-200"
            title={
              <>
                Attached Document&nbsp;
                <DocumentIcon width="22px" />
              </>
            }
          >
            <Box h={"855px"} margin="0 auto" maxW={"855px"} className="" display={"flex"} justifyContent={"center"}>
              <embed src={PDFAttribute.value} height="100%" width="100%" />
            </Box>
          </Accordion>
        </Box>
      )}
    </PageWrapper>
  );
}
export default NFT;
