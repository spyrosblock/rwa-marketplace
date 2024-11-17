"use client";

// TODO: research better pattern for global state
// TODO: update useScaffoldContractRead to new version
// TODO: fix prettier putting in spaces that eslint is throwing errors on
import { createRef, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Nft, blank } from "../../types/Asset";
import { DescribeForm } from "./_components/DescribeForm";
import { MintForm } from "./_components/MintForm";
import { TokenizeForm } from "./_components/TokenizeForm";
import { Box, Grid, Tab, TabList, TabPanel, TabPanels, Tabs } from "@chakra-ui/react";
import { useDropzone } from "react-dropzone";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { Input, PageWrapper } from "~~/components";
import { singleUpload } from "~~/services/ipfs";

enum Stage {
  describe,
  tokenize,
  mint,
  attest,
}
export interface Erc20Data {
  name: string;
  symbol: string;
  supply: number;
  address: any;
  receipt: any;
}
export interface State {
  stage: number;
  setStage: (arg0: number) => void;
  asset: Nft;
  setAsset: (arg0: Nft) => void;
  erc20Data: Erc20Data;
  setErc20Data: (arg0: Erc20Data) => void;
}

export default function Page() {
  const searchParams = useSearchParams();
  //@ts-expect-error
  const defaultStage = Stage[searchParams.get("step") || "describe"];
  const [asset, setAsset] = useState<Nft>(blank);
  const [stage, setStage] = useState<number>(defaultStage);
  // change the initial erc20Data
  const [erc20Data, setErc20Data] = useState<Erc20Data>({
    name: "",
    symbol: "",
    supply: 0,
    address: "",
    receipt: {},
  });

  const state: State = {
    stage: stage,
    setStage: setStage,
    asset: asset,
    setAsset: setAsset,
    erc20Data: erc20Data,
    setErc20Data: setErc20Data,
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      const returnedImageUrl = await singleUpload(file, file.name);
      setAsset({ ...asset, image: returnedImageUrl });
    },
    [asset],
  );

  const { getRootProps } = useDropzone({ onDrop, accept: { "image/*": [] } });
  const dropZoneRef: React.LegacyRef<HTMLDivElement> | undefined = createRef();
  const handleStageClick = (e: any) => {
    if (process.env.NODE_ENV === "development") {
      setStage(Number(e.target.dataset.index));
    }
  };

  const handleInputChange = (e: { target: { value: any } }) => {
    setAsset({ ...asset, image: e.target.value });
  };

  return (
    <PageWrapper>
      <Grid h={"full"} templateColumns="60% 1fr" gap={4}>
        <Box w={"full"} h={"full"} pos="relative" overflow={"hidden scroll"} mt={"-15px"}>
          <Tabs w={"full"} h={"full"} index={stage} isLazy ml={"-15px"}>
            <TabList
              pt={1}
              position={"sticky"}
              top={0}
              backgroundColor={"var(--chakra-colors-chakra-body-bg)"}
              className="z-10"
            >
              <Tab id="0" onClick={handleStageClick}>
                Describe
              </Tab>
              <Tab id="1" onClick={handleStageClick}>
                Tokenize
              </Tab>
              <Tab id="2" onClick={handleStageClick}>
                Mint
              </Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={0}>
                <DescribeForm state={state} />
              </TabPanel>
              <TabPanel>
                <TokenizeForm state={state} />
              </TabPanel>
              <TabPanel>
                <MintForm state={state} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
        <Box display={"flex"} flexDir={"column"} justifyContent={"start"} alignItems={"center"} mt={8}>
          <div
            {...getRootProps()}
            ref={dropZoneRef}
            className="w-full min-h-96 bg-neutral flex justify-center items-center rounded-lg"
          >
            <Box
              backgroundImage={asset.image || ""}
              backgroundRepeat={"no-repeat"}
              backgroundSize={"contain"}
              backgroundPosition={"center"}
              transition={"background-image 1s ease-in-out"}
              display={"flex"}
              justifyContent={"center"}
              className={"w-full h-full " + (asset.image ? "auto" : "cursor-pointer")}
            >
              {!asset.image && (
                <div className="flex flex-col justify-center ">
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
                  Upload Image
                </div>
              )}
            </Box>
          </div>
          <div className="flex flex-col justify-center w-full ">
            <div className="divider mt-8">OR</div>
            <Input
              name="NFT Image Url"
              placeholder="https://ipfs.io/pathToImage.jpg"
              value={asset.image}
              onChange={handleInputChange}
            />
          </div>
        </Box>
      </Grid>
    </PageWrapper>
  );
}
