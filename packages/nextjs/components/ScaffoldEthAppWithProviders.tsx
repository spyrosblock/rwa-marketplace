"use client";

import { useEffect, useState } from "react";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { useAccount } from "wagmi";
import { Header } from "~~/components/Header";
import { BlockieAvatar } from "~~/components/scaffold-eth";
import { ProgressBar } from "~~/components/scaffold-eth/ProgressBar";
import { useInitializeNativeCurrencyPrice } from "~~/hooks/scaffold-eth";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import useGlobalState from "~~/services/store/globalState";
import { wagmiConfig } from "~~/services/web3/wagmiConfig";
import theme from "~~/tailwind.config";

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  useInitializeNativeCurrencyPrice();
  const [lastFetchedAddress, setLastFetchedAddress] = useState<string | undefined>(undefined);
  const [tokenIds, setTokenIds] = useGlobalState("userOwnedTokenIds");
  const { address } = useAccount();

  const { data: fetchedTokenIds, refetch } = useScaffoldReadContract({
    contractName: "NFTFactory",
    functionName: "getTokensByAddress",
    args: [address],
  });

  useEffect(() => {
    // needs to go top level for menu links
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
  }, [address, lastFetchedAddress, tokenIds.length, refetch, fetchedTokenIds, setTokenIds]);
  return (
    <div className="h-screen">
      <div className="flex flex-col h-full">
        <Header />
        <main className="relative flex flex-col flex-1 h-full overflow-auto">{children}</main>
        {/* <Footer /> */}
      </div>
      <Toaster />
    </div>
  );
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

export const ScaffoldEthAppWithProviders = ({ children }: { children: React.ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider
          theme={extendTheme({
            colors: theme.theme?.extend?.colors,
          })}
        >
          <ProgressBar />
          <RainbowKitProvider
            avatar={BlockieAvatar}
            theme={mounted ? (isDarkMode ? darkTheme() : lightTheme()) : lightTheme()}
          >
            <ScaffoldEthApp>{children}</ScaffoldEthApp>
          </RainbowKitProvider>
        </ChakraProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
