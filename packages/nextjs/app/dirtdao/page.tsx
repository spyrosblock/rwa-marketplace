"use client";

import React, { useEffect } from "react";
import { useAccount } from "wagmi";
import { PageWrapper, Text } from "~~/components";

const DirtDao: React.FC = () => {
  const { address } = useAccount();

  useEffect(() => {
    const fetchTokenIds = async () => {
      // some fetch logic
    };

    fetchTokenIds();
  }, []);

  return (
    <PageWrapper>
      <Text display="block" bold size="xxl">
        Cup of Dirt Dao
      </Text>
      <Text mb={8}>{address}</Text>
      <progress className="progress progress-accent w-56" value={25} max="100"></progress>
    </PageWrapper>
  );
};

export default DirtDao;
