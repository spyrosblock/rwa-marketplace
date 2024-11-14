import { Erc20Data, State } from "../page";
import { Box, Flex, HStack, Select, Stack } from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import Button from "~~/components/Button";
import Input from "~~/components/Input";
import Text from "~~/components/Text";

export const TokenizeForm = ({ state }: { state: State }) => {
  const {
    stage,
    setStage,
    erc20Data,
    setErc20Data,
  }: {
    stage: any;
    setStage: (arg0: any) => void;
    erc20Data: Erc20Data;
    setErc20Data: (arg0: Erc20Data) => void;
  } = state;

  // either all fields are filled or none are filled
  const canProceed =
    (erc20Data.name && erc20Data.symbol && erc20Data.supply) ||
    (!erc20Data.name && !erc20Data.symbol && !erc20Data.supply);

  const handleInputChange = (e: { target: { value: any; name: any } }) => {
    const value = e.target.value;
    const key = e.target.name;
    setErc20Data({ ...erc20Data, [key]: value });
  };

  return (
    <Stack pl={2} pr={4} gap={6}>
      <Box>
        <Text display={"block"}>
          ERC20 Token <Text tiny>(optional)</Text>
        </Text>
        <Text tiny display="block">
          This section will help walk you through setting up fractional tokens for use in Governance and/or DeFi. Feel
          free to skip this step and proceed directly to mint if you do not desire these capabilities.
        </Text>
      </Box>
      <Box>
        <HStack mb={2}>
          <Box width={"50%"}>
            <Input defaultValue={erc20Data.name} name="name" placeholder="Token Name" onChange={handleInputChange} />
          </Box>
          <Box width={"50%"}>
            <Input
              defaultValue={erc20Data.symbol}
              name="symbol"
              placeholder="Symbol (SYM)"
              onChange={handleInputChange}
            />
          </Box>
        </HStack>
        <Select onChange={handleInputChange} value={erc20Data.supply} name="supply" placeholder="Total Supply">
          <option value="100">100</option>
          <option value="100000">100,000</option>
          <option value="1000000">1,000,000</option>
        </Select>
      </Box>
      <HStack>
        <Box width={"50%"}>
          <Button width={"full"} onClick={() => setStage(stage - 1)}>
            <Flex width={"full"} justifyContent={"space-between"} alignItems={"center"}>
              <ChevronLeftIcon width="20" /> Back{" "}
              <ChevronRightIcon opacity={0} width={20} className="justify-self-end" />
            </Flex>
          </Button>
        </Box>
        <Box width={"50%"}>
          <Button width={"full"} colorScheme={"teal"} isDisabled={!canProceed} onClick={() => setStage(stage + 1)}>
            <Flex width={"full"} justifyContent={"space-between"} alignItems={"center"}>
              <ChevronLeftIcon opacity={0} width="20" /> Next{" "}
              <ChevronRightIcon width={20} className="justify-self-end" />
            </Flex>
          </Button>
        </Box>
      </HStack>
    </Stack>
  );
};
