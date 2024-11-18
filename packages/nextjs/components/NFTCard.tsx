import React, { useEffect, useState } from "react";
import Link from "next/link";
import styled from "styled-components";
import { Button, Card } from "~~/components";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { getData } from "~~/utils/helpers";

interface CardProps {
  className?: string;
  id: string | bigint;
}

const StyledCard = styled(Card)`
  .css-selector: "attribute";
`;

const NFTCard: React.FC<CardProps> = ({ className, id }) => {
  const bigIntId = BigInt(id);
  const tokenURI = useScaffoldReadContract({
    contractName: "NFTFactory",
    functionName: "tokenURI",
    args: [bigIntId],
  }).data;

  const [data, setData] = useState<any>();
  // const [error, setError] = useState<string>();
  // const [isLoading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // handles non-ipfs and json set on smart contract itself
    // TODO: handle loading and error states
    if (tokenURI && !data) {
      try {
        setData(JSON.parse(tokenURI));
        // setLoading(false);
      } catch (error) {
        getData(tokenURI)
          .catch((): any => {
            // setLoading(false);
            // setError(`Invalid JSON returned for token #${id}:${tokenURI}.`);
          })
          .then(response => {
            setData(response);
            // setLoading(false);
          });
      }
    }
  }, [data, tokenURI, id]);
  if (!tokenURI) return;

  // const metadata = (
  //   <div className="grid grid-cols-2 gap-2">
  //     <div className="flex flex-col">
  //       Symbol
  //       {nftData.symbol}
  //     </div>
  //     <div>ID</div>
  //     <div>Address</div>
  //     <div>Chain</div>
  //   </div>
  // );
  // symbol id address chain
  return data ? (
    <StyledCard
      title={data?.name}
      className={`${className || ""}`}
      imageUrl={data.image}
      footer={
        <Link className="w-full" href={`/nft?id=${id}`}>
          <Button width={"full"} colorScheme="teal">
            View Details
          </Button>
        </Link>
      }
    >
      {data.description}
      {/* <div className="divider"></div>
      {metadata} */}
    </StyledCard>
  ) : (
    <></>
  );
};

export default NFTCard;
