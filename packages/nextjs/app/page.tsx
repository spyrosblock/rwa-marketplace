"use client";

import packageJson from "../../../package.json";
import { Box } from "@chakra-ui/react";
import type { NextPage } from "next";
import { Button, PageWrapper } from "~~/components";
import Text from "~~/components/Text";

const Home: NextPage = () => {
  return (
    <PageWrapper className="justify-center">
      <div className="text-center">
        <div>
          <div className="text-6xl mb-4">
            L <span style={{ color: "red", opacity: ".75" }}> £</span> G T<br></br>
          </div>
          <Text className="block" bold>
            Legally Empowered Governance Tokens
          </Text>
          <Text>securely attach legal contracts to your RWA tokens</Text>
          <Text display="block" mb={8}>
            used where <Text $highlight="red">digital</Text> meets <Text $highlight="red">physical</Text>
          </Text>
          <Button colorScheme={"teal"} onClick={() => (window.location.href = "/create")}>
            Mint RWA Token
          </Button>

          <Box maxW="md" mb={8} marginX={"auto"} maxWidth={"500px"}></Box>
          <div className="text-gray-500 mb-4">
            <div>handles real world cataclystic events</div>
            <div>applies jurisdictional compliance</div>
            <div>resolve on-chain disputes</div>
            {/* <div>new financial products</div> */}
            <div>instant rwa liquidity</div>
          </div>
          <div className="space-y-3 mb-4">
            <div>
              <a className="btn btn-sm btn-ghost" href="https://docs.legt.co" target="_blank">
                <button>Documentation</button>
              </a>
            </div>
            <div>
              <a className="btn btn-sm btn-ghost" href="https://discord.gg/BKSRV5fFRH" target="_blank">
                <button>Discord</button>
              </a>
            </div>
          </div>
          <div className="text-gray-300 mb-8">v{packageJson.version}</div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Home;
