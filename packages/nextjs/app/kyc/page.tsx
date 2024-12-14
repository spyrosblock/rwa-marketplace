"use client";

import { useEffect, useState } from "react";
// import { ReactComponent as CreditImage } from "./credit.svg";
// import { PrimaryButton } from "./Buttons/PrimaryButton";
// import AppFooter from "components/shared/AppFooter";
// import AppHeader from "components/shared/AppHeader";
// import { BREAKPOINTS } from "config";
import { KintoAccountInfo, createKintoSDK } from "kinto-web-sdk";
// import numeral from "numeral";
import styled from "styled-components";
import { Address, createPublicClient, defineChain, encodeFunctionData, getContract, http } from "viem";
import contractsJSON from "~~/abis/7887.json";
import { Button } from "~~/components";
import { PageWrapper } from "~~/components";
// import {
//   useScaffoldContract,
//   useScaffoldEventHistory,
//   useScaffoldReadContract,
//   useScaffoldWriteContract,
// } from "~~/hooks/scaffold-eth";
import chainData from "~~/utils/chainData";
import { getAllContracts } from "~~/utils/scaffold-eth/contractsData";

const BREAKPOINTS = {
  large: "1440px",
  standard: "1280px",
  tablet: "1024px",
  bmobile: "860px",
  mobile: "598px",
  smobile: "400px",
};
// import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";

interface KYCViewerInfo {
  isIndividual: boolean;
  isCorporate: boolean;
  isKYC: boolean;
  isSanctionsSafe: boolean;
  getCountry: string;
  getWalletOwners: Address[];
}

const kinto = defineChain({
  id: 7887,
  name: "Kinto",
  network: "kinto",
  nativeCurrency: {
    decimals: 18,
    name: "ETH",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.kinto-rpc.com/"],
      webSocket: ["wss://rpc.kinto.xyz/ws"],
    },
  },
  blockExplorers: {
    default: { name: "Explorer", url: "https://kintoscan.io" },
  },
});

const KintoConnect = () => {
  const [accountInfo, setAccountInfo] = useState<KintoAccountInfo | undefined>(undefined);
  const [kycViewerInfo, setKYCViewerInfo] = useState<any | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const { NFTFactoryKyc } = getAllContracts(chainData.kycChainId);
  console.log("NFTFactoryKyc:", NFTFactoryKyc);
  // console.log("page account, kyc, contract:", accountInfo, kycViewerInfo, NFTFactoryKyc);
  const [nftFactoryName, setNftFactoryName] = useState<string | undefined>(undefined);
  const kintoSDK = createKintoSDK(NFTFactoryKyc.address);

  async function kintoLogin() {
    try {
      const wallet = await kintoSDK.createNewWallet();
      console.log("wallet:", wallet);
    } catch (error) {
      console.error("Failed to login/signup:", error);
    }
  }

  async function mintNFT() {
    const data = encodeFunctionData({
      abi: NFTFactoryKyc.abi,
      functionName: "mint",
      args: [
        accountInfo?.walletAddress,
        "https://exampletokenuri.com",
        "0x0000000000000000000000000000000000000000",
        [],
        "KYC Token",
        "KTT",
        [accountInfo?.walletAddress],
        [100000000000000000000],
      ],
    });
    setLoading(true);
    try {
      const response = await kintoSDK.sendTransaction([
        { to: NFTFactoryKyc.address as `0x${string}`, data, value: BigInt(0) },
      ]);
      console.log("response:", response);
      // await fetchNFTFactory();
    } catch (error) {
      console.error("Failed to login/signup:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!accountInfo) {
      fetchAccountInfo();
    }
    if (!nftFactoryName) {
      fetchNFTFactory();
    }
    async function fetchNFTFactory() {
      const client = createPublicClient({
        chain: kinto,
        transport: http(),
      });

      const nftFactoryContract = getContract({
        address: NFTFactoryKyc.address as Address,
        abi: NFTFactoryKyc.abi,
        client: { public: client },
      });
      const name = await nftFactoryContract.read.name();
      setNftFactoryName(name as string);
    }
    async function fetchAccountInfo() {
      try {
        console.log("fetching account", accountInfo, kintoSDK);
        const kintoAccount = await kintoSDK.connect();
        console.log("set account", kintoAccount, kintoSDK);
        setAccountInfo(kintoAccount);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch account info:", error);
        setLoading(false);
      }
      console.log("account login");
    }
    async function fetchKYCViewerInfo() {
      if (!accountInfo?.walletAddress) return;

      const client = createPublicClient({
        chain: kinto,
        transport: http(),
      });
      const kycViewer = getContract({
        address: contractsJSON.contracts.KYCViewer.address as Address,
        abi: contractsJSON.contracts.KYCViewer.abi,
        client: { public: client },
      });

      try {
        const [isIndividual, isCorporate, isKYC, isSanctionsSafe, getCountry, getWalletOwners] = await Promise.all([
          kycViewer.read.isIndividual([accountInfo.walletAddress]),
          kycViewer.read.isCompany([accountInfo.walletAddress]),
          kycViewer.read.isKYC([accountInfo.walletAddress]),
          kycViewer.read.isSanctionsSafe([accountInfo.walletAddress]),
          kycViewer.read.getCountry([accountInfo.walletAddress]),
          kycViewer.read.getWalletOwners([accountInfo.walletAddress]),
        ]);

        setKYCViewerInfo({
          isIndividual,
          isCorporate,
          isKYC,
          isSanctionsSafe,
          getCountry,
          getWalletOwners,
        } as KYCViewerInfo);
      } catch (error) {
        console.error("Failed to fetch KYC viewer info:", error);
      }

      console.log("KYCViewerInfo:", kycViewerInfo);
    }
    if (!kycViewerInfo && accountInfo?.walletAddress) {
      fetchKYCViewerInfo();
    }
  }, [NFTFactoryKyc.abi, NFTFactoryKyc.address, accountInfo, kintoSDK, kycViewerInfo, nftFactoryName]);

  // if (loading) return <PageWrapper>loading...</PageWrapper>;
  if (!accountInfo)
    return (
      <PageWrapper>
        <div onClick={kintoLogin}>verifying with kinto...</div>
      </PageWrapper>
    );

  // todo: add info about the dev portal and link
  return (
    <PageWrapper>
      <WholeWrapper>
        <AppWrapper>
          <ContentWrapper>
            {loading && !accountInfo ? (
              <div>loading...</div>
            ) : (
              <>{!accountInfo && <div onClick={kintoLogin}>Login/Signup</div>}</>
            )}
            {accountInfo && (
              <BgWrapper>
                <CounterWrapper>
                  {!accountInfo.walletAddress && <div onClick={kintoLogin}>Login/Signup</div>}
                  <WalletRows>
                    <WalletRow key="chain">
                      <WalletRowName>Chain</WalletRowName>
                      <WalletRowValue>
                        <KintoLabel>Kinto (ID: 7887)</KintoLabel>
                      </WalletRowValue>
                    </WalletRow>
                    <WalletRow key="app">
                      <WalletRowName>App</WalletRowName>
                      <WalletRowValue>
                        <div>{NFTFactoryKyc.address}</div>
                      </WalletRowValue>
                    </WalletRow>
                    <WalletRow key="address">
                      <WalletRowName>Wallet</WalletRowName>
                      <WalletRowValue>
                        <div>{accountInfo.walletAddress}</div>
                      </WalletRowValue>
                    </WalletRow>
                    {/* <WalletRow key="Application Key">
                      <WalletRowName>App Key</WalletRowName>
                      <WalletRowValue>
                        <div>{accountInfo.appKey as Address}</div>
                      </WalletRowValue>
                    </WalletRow> */}
                    {kycViewerInfo && (
                      <>
                        <WalletRow key="isIndividual">
                          <WalletRowName>Is Individual</WalletRowName>
                          <WalletRowValue>
                            <ETHValue>{kycViewerInfo.isIndividual ? "Yes" : "No"}</ETHValue>
                          </WalletRowValue>
                        </WalletRow>
                        <WalletRow key="isCorporate">
                          <WalletRowName>Is Corporate</WalletRowName>
                          <WalletRowValue>
                            <ETHValue>{kycViewerInfo.isCorporate ? "Yes" : "No"}</ETHValue>
                          </WalletRowValue>
                        </WalletRow>
                        <WalletRow key="isKYC">
                          <WalletRowName>Is KYC</WalletRowName>
                          <WalletRowValue>
                            <ETHValue>{kycViewerInfo.isKYC ? "Yes" : "No"}</ETHValue>
                          </WalletRowValue>
                        </WalletRow>
                        <WalletRow key="isSanctionsSafe">
                          <WalletRowName>Is Sanctions Safe</WalletRowName>
                          <WalletRowValue>
                            <ETHValue>{kycViewerInfo.isSanctionsSafe ? "Yes" : "No"}</ETHValue>
                          </WalletRowValue>
                        </WalletRow>
                        <WalletRow key="country">
                          <WalletRowName>Country</WalletRowName>
                          <WalletRowValue>
                            <ETHValue>{kycViewerInfo.getCountry}</ETHValue>
                          </WalletRowValue>
                        </WalletRow>
                      </>
                    )}
                    <WalletRow key="nftFactoryContract">
                      <WalletRowName>Factory Name</WalletRowName>
                      <WalletRowValue>
                        <ETHValue>{nftFactoryName}</ETHValue>
                      </WalletRowValue>
                    </WalletRow>
                  </WalletRows>
                  <WalletNotice>
                    {/* <span>Attention!</span> Only send funds to your wallet address in the Kinto Network */}
                  </WalletNotice>
                  {accountInfo && (
                    <Button colorScheme="blue" onClick={mintNFT}>
                      Mint NFT
                    </Button>
                  )}
                </CounterWrapper>
              </BgWrapper>
            )}
          </ContentWrapper>
        </AppWrapper>
      </WholeWrapper>
    </PageWrapper>
  );
};

const WholeWrapper = styled.div`
  flex-flow: column nowrap;
  height: auto;
  align-items: center;
  width: 100%;
  display: flex;
  min-height: 100vh;
  min-width: 100vw;
  position: relative;
  left: 100px;
`;

const AppWrapper = styled.div`
  flex-flow: column nowrap;
  height: auto;
  align-items: center;
  width: 100%;
  display: flex;
  min-height: 85vh;
  min-width: 100vw;

  @media only screen and (max-width: 400px) {
    min-height: 90vh;
  }
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-flow: column nowrap;
  justify-content: flex-start;
  align-items: center;
  height: auto;
  min-height: 100vh;
  width: 100%;
  background: url(engen/commitment.svg) no-repeat;
  background-position-x: right;
  background-size: auto;
  overflow: hidden;
`;

const BgWrapper = styled.div`
  display: flex;
  width: 100%;
  flex-flow: column nowrap;
  justify-content: center;
`;

const CounterWrapper = styled.div`
  display: flex;
  flex-flow: column nowrap;
  align-items: flex-start;
  gap: 32px;
  padding: 16px 0;
`;

const WalletRows = styled.div`
  display: flex;
  padding-top: 16px;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  align-self: stretch;
  max-width: 800px;
  border-top: 1px solid var(--light-grey3);
`;

const WalletRow = styled.div`
  display: flex;
  flex-flow: row nowrap;
  padding-bottom: 16px;
  align-items: center;
  gap: 32px;
  align-self: stretch;
  border-bottom: 1px solid var(--light-grey3);
  width: 100%;
  overflow: hidden;
`;

const WalletRowName = styled.div`
  width: 150px;
  color: var(--night);
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;

  @media only screen and (max-width: ${BREAKPOINTS.mobile}) {
    width: 60px;
    font-size: 14px;
  }
`;

const WalletRowValue = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  flex: 1 0 0;
  align-self: stretch;
  font-size: 24px;
  font-weight: 700;
  line-height: 120%;

  @media only screen and (max-width: ${BREAKPOINTS.mobile}) {
    font-size: 20px;
  }
`;

const KintoLabel = styled.div`
  color: var(--night);
  font-size: 24px;
  font-weight: 400;
  line-height: 120%; /* 28.8px */
  @media only screen and (max-width: ${BREAKPOINTS.mobile}) {
    font-size: 20px;
  }
`;

const WalletNotice = styled.div`
  color: var(--dark-grey);
  font-size: 18px;
  font-weight: 400;
  width: 95%;

  span {
    color: var(--orange);
    font-weight: 700;
  }
`;

const ETHValue = styled.div`
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  gap: 8px;
  font-size: 24px;
  font-weight: 400;
  line-height: 120%;
  color: var(--night);

  @media only screen and (max-width: ${BREAKPOINTS.mobile}) {
    font-size: 24px;
  }
`;

function App() {
  return (
    <div className="App">
      <KintoConnect />
    </div>
  );
}

export default App;
