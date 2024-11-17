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
      <Text>{address}</Text>
    </PageWrapper>
  );
};

export default DirtDao;
