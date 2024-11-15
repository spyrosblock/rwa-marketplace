// import { useState } from "react";
import { useState } from "react";
import AssetTypes from "../../../types/Asset";
import { State } from "../page";
// import UploadInput from "./UploadInput";
import { Box, Flex, HStack, Select, Stack } from "@chakra-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Alert, Button, Input, Text } from "~~/components";
import { Label } from "~~/components/Input";
import chainData from "~~/utils/chainData";
import { cleanAttributes, createAttribute, getAttribute, updateAttributes } from "~~/utils/helpers";

// TODO: all data fields aren't clearing on nft mint, such as document, the attributes of the nft itself

export const DescribeForm = ({ state }: { state: State }) => {
  const { stage, setStage, asset, setAsset } = state;
  const error = ""; //const [error, setError] = useState("");
  const [attributeInput, setAttributeInput] = useState<any>("");
  const [valueInput, setValueInput] = useState<any>("");
  // const [customAttributes, setCustomAttributes] = useState<any>({});
  // const [pdfUploading, setPdfUploading] = useState<boolean>(false);
  // const pdfAttribute = getAttribute(chainData.linkedPdfKey, asset.attributes);

  const canProceed = () => {
    let can = asset.name && asset.description;
    asset.attributes.map((attr: any) => (can = can && (attr.required ? attr.value : true)));
    return can;
  };

  const handleAttributeChange = (e: { target: { value: any; name: any } }) => {
    const value = e.target.value;
    const key = e.target.name;
    const newAsset = {
      ...asset,
      attributes: updateAttributes(asset.attributes, key, value),
    };
    setAsset(newAsset);
  };

  // const handlePdfDrop = async (event: any) => {
  //   console.log("event", event);
  //   if (pdfUploading) return;
  //   const handleError = (err: string) => {
  //     setError(err);
  //     setPdfUploading(false);
  //   };
  //   setPdfUploading(true);
  //   const pdfHash = await singleUpload(event[0], event[0].path, handleError);
  //   const pdfHash = "0xNeedsToReplaceThis";
  //   console.log("pdfHash:", pdfHash);
  //   const pdfAddition = createAttribute(chainData.linkedPdfKey, chainData.baseIPFSUrl + pdfHash);
  //   const cleanedAttributes = cleanAttributes(asset.attributes, chainData.linkedPdfKey);
  //   setAsset({   // TODO
  //     ...asset,
  //     nft: {...asset, attributes: [...cleanedAttributes, pdfAddition]}
  //   });
  //   setError("");
  //   setPdfUploading(false);
  // };

  return (
    <>
      <Stack p={4} gap={4}>
        <Text tiny>
          Describe your token and list useful information about it. The more information you provide, the more trusted
          and reputable the token will be. Selecting a category below will help you know what information to provide for
          that specific asset class.
        </Text>

        <Input
          label="NFT Name"
          name="name"
          defaultValue={asset.name}
          onChange={e => setAsset({ ...asset, name: e.target.value })}
          placeholder="NFT Name"
        />
        <Input
          label="NFT Description"
          name="description"
          textarea
          defaultValue={asset.description}
          onChange={e => setAsset({ ...asset, description: e.target.value })}
          placeholder="This token represents my real world asset... it's a great asset because... this token represents involvement such that... etc."
        />
        <Box>
          <Input
            value={getAttribute(chainData.linkedPdfKey, asset.attributes)?.value || ""}
            name={chainData.linkedPdfKey}
            label="Linked Document"
            note={
              "Input a link to the document that describes this asset, verifies authenticity and/or defines the rights associated with token ownership. It is encouraged that this document is hosted on a decentralized storage service such as IPFS and is notarized if being considered legally binding."
            }
            placeholder={"https://website.com/document.pdf"}
            onChange={handleAttributeChange}
          />
        </Box>
        <Box>
          <Input
            name="category"
            inputElement={
              <Select
                onChange={e => {
                  const newCategory = e.target.value;
                  if (newCategory !== null) {
                    setAsset(AssetTypes[newCategory]);
                  }
                }}
                value={getAttribute("category", asset.attributes)?.value || ""}
                className="placeholder:"
              >
                <option value="blank">None</option>
                <option value="realEstate">Real Estate</option>
                <option value="vehicle">Vehicle</option>
                <option value="art">Art</option>
              </Select>
            }
            note={
              getAttribute("category", asset.attributes)
                ? "The fields provided below are required for this category"
                : ""
            }
          />

          {cleanAttributes(asset.attributes, chainData.linkedPdfKey).map((attr: any) =>
            attr.hideInList ? null : (
              <Input
                key={attr.trait_type}
                defaultValue={attr.value}
                name={attr.trait_type}
                type={attr.inputType}
                label={attr.trait_type}
                placeholder={attr.placeholder}
                onChange={handleAttributeChange}
              />
            ),
          )}
          <Box>
            <HStack>
              <Box width={"50%"} pr={1} mt={2}>
                <Label>Custom Attribute</Label>
              </Box>
              <Box width={"50%"} pr={1}>
                <Label>Value </Label>
              </Box>
            </HStack>
            <HStack>
              <Box width={"50%"} pr={1}>
                <Input
                  label={"none"}
                  value={attributeInput}
                  type="text"
                  placeholder="attribute"
                  onChange={e => {
                    setAttributeInput(e.target.value);
                  }}
                />
              </Box>
              <Box width={"50%"}>
                <Input
                  label={"none"}
                  type="text"
                  value={valueInput}
                  placeholder="value"
                  groupedElement={
                    <Button
                      size={"sm"}
                      onClick={() => {
                        if (attributeInput && valueInput) {
                          const newAttribute = createAttribute(attributeInput, valueInput);
                          if (newAttribute) {
                            setAsset({ ...asset, attributes: [...asset.attributes, newAttribute] });
                          }
                          setAttributeInput("");
                          setValueInput("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  }
                  onChange={e => {
                    setValueInput(e.target.value);
                  }}
                />
              </Box>
            </HStack>
            <Text tiny display={"block"} mt={1}>
              Adding custom attributes is optional, but recommended. They will be stored as part of the minted NFT and
              will follow the{" "}
              <a
                style={{ textDecoration: "underline" }}
                target="_blank"
                href="https://docs.opensea.io/docs/metadata-standards#attributes"
                rel="noreferrer"
              >
                OpenSea Standard
              </a>
            </Text>
          </Box>
          {/* {!isEmpty(customAttributes) && (
            <Button
              w={"full"}
              mt={4}
              variant={"outline"}
              colorScheme="teal"
              onClick={() => {
                setAsset({ ...asset, attributes: [...asset.attributes, customAttributes] });
              }}
            >
              + Another Attribute
            </Button>
          )} */}
        </Box>

        {error && <Alert type="error" message={error} />}
        <Button colorScheme={"teal"} isDisabled={!canProceed()} onClick={() => setStage(stage + 1)}>
          <Flex width={"full"} justifyContent={"space-between"} alignItems={"center"}>
            <ChevronLeftIcon opacity={0} width="20" /> Next <ChevronRightIcon width={20} className="justify-self-end" />
          </Flex>
        </Button>
        {!canProceed() && (
          <Text tiny display={"block"}>
            Button is disabled because of missing information in the form above such as name, description, linked
            document, image or required asset fields.
          </Text>
        )}
      </Stack>
    </>
  );
};
