"use client";

import React, { useEffect, useState } from "react";
// import { Flex } from "@chakra-ui/react";
import { useAccount } from "wagmi";
import { NFTCard, PageWrapper } from "~~/components";
// import { Address } from "~~/components/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const DashboardPage: React.FC = () => {
  const { address } = useAccount();
  const [tokenIds, setTokenIds] = useState<bigint[]>([]);
  const [lastFetchedAddress, setLastFetchedAddress] = useState<string | undefined>(undefined);

  const { data: fetchedTokenIds, refetch } = useScaffoldReadContract({
    contractName: "NFTFactory",
    functionName: "getTokensByAddress",
    args: [address],
  });

  useEffect(() => {
    const fetchTokenIds = async () => {
      if ((address && tokenIds.length === 0) || address !== lastFetchedAddress) {
        await refetch();
        if (fetchedTokenIds) {
          setTokenIds([...fetchedTokenIds]);
          setLastFetchedAddress(address);
        }
      }
    };

    fetchTokenIds();
  }, [address, lastFetchedAddress, tokenIds.length, refetch, fetchedTokenIds]);

  return (
    <PageWrapper>
      {/* <Flex align="start" width={"full"}>
        <h1 className="text-3xl font-bold mb-6 flex">
          Hi, <Address address={address} disableAvatar disableAddressLink />
        </h1>
      </Flex> */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 space-4">
        <Card>List asset for sale</Card>
        <Card>Distribute funds</Card>
        <Card>Request payment</Card>
      </div> */}
      <h1 className="text-3xl font-bold mb-6 flex items-start text-left w-full">Your NFTs</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 space-4">
        {tokenIds?.map(id => (
          <NFTCard key={id} id={id} />
        ))}
      </div>
    </PageWrapper>
  );
};

export default DashboardPage;
