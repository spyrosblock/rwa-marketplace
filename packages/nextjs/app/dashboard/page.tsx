"use client";

import { NFTCard, PageWrapper } from "~~/components";
import useGlobalState from "~~/services/store/globalState";

const DashboardPage: React.FC = () => {
  const [tokenIds] = useGlobalState("userOwnedTokenIds");

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
