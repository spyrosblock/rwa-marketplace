//TODO: bring over nftInterface
// import { nftInterface } from "./store/store";
import axios from "axios";
import { isObject } from "lodash";
import { formatEther } from "viem";
import { Attribute } from "~~/types/Asset";

export const format = (
  value: any,
  options?: { isCurrency?: any; from18?: any; to18?: boolean; returnNumber?: boolean } | undefined,
) => {
  if (!value) return;
  let formattedValue = value;

  if (options?.to18) {
    // When converting to 18 decimals, return as string to preserve precision
    return String(formattedValue) + "000000000000000000";
  }

  // 0-50 => 26.24
  if (Number(formattedValue) < 50 && Number(formattedValue) > 1) {
    formattedValue = Number(formattedValue)?.toFixed(2);
  }
  // 100000000000000000000000000 => 10000000
  if (options?.from18) {
    formattedValue = formatEther(BigInt(formattedValue));
  }

  // Add commas and $ => 1,000 || $1,000
  if (!options?.returnNumber && (formattedValue > 999 || options?.isCurrency)) {
    formattedValue = Intl.NumberFormat("en-US", {
      ...(options?.isCurrency && { style: "currency", currency: "USD" }),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(formattedValue));
  }
  // .000456
  if (formattedValue < 1) {
    formattedValue = Intl.NumberFormat("en-US", {
      ...(options?.isCurrency && { style: "currency", currency: "USD" }),
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(Number(formattedValue));
  }

  // Only convert to number for small values where precision loss isn't a concern
  if (options?.returnNumber && Number(formattedValue) < Number.MAX_SAFE_INTEGER) {
    formattedValue = Number(formattedValue);
  }

  return formattedValue;
};

export function createAttribute(key: string, value: any, optional?: object) {
  if (!key || !value) return;
  return { trait_type: key, value: value, ...optional };
}

export const cleanAttributes = (attributes: Attribute[], duplicateString: string) =>
  (attributes || []).filter((att: { trait_type: string }) => att.trait_type != duplicateString);

// Function to update or add an attribute in the attributes array
export function updateAttributes(attributes: Attribute[], key: string, value: any) {
  // Check if the key already exists in the attributes
  const index = attributes.findIndex(att => att.trait_type === key);

  if (index !== -1) {
    // If key is found, update the existing value
    attributes[index].value = value;
  } else {
    // If key is not found, create a new attribute and add it
    const newAttribute = createAttribute(key, value);
    if (newAttribute) {
      attributes.push(newAttribute);
    }
  }

  return attributes;
}

export const shortenHash = (hash: string) => {
  if (!hash) return;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
};

export function getAttribute(string: string, attributes: Attribute[]) {
  if (!attributes || attributes.length === 0) return;
  return attributes?.find((attribute: Attribute) => {
    if (attribute.trait_type?.toLowerCase && string?.toLowerCase) {
      return attribute.trait_type.toLowerCase() === string.toLowerCase();
    }
  });
}

export const jsonToStringSafe = (e: any) => {
  let returnString;
  try {
    returnString = JSON.stringify(e, (_, value) => (typeof value === "bigint" ? value.toString() : value));
  } catch (error) {
    console.error("error converting json to string", error);
  }
  return returnString;
};

export const stringToJsonSafe = (e: any) => {
  let returnJson;
  try {
    returnJson = JSON.parse(e);
  } catch (error) {
    console.error("error converting string to json", error);
  }
  return returnJson;
};

export const getData = async (url: string) => {
  const response = await axios.get(url).catch(error => {
    throw "HTTP Request Error:" + error;
  });
  const data = response?.data;
  if (isObject(data)) {
    return data;
  } else {
    throw "Data Improperly Formatted Error:" + url;
  }
};

export const ipfsToJsonSafe = async (url: any) => {
  try {
    async function getData() {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      const jsonData = await response.json();
      return jsonData;
    }
    return await getData();
  } catch (error) {
    console.log("error converting ipfs url to json");
    console.error(error);
  }
};

export const fetchNftData = async (url: string) => {
  try {
    return JSON.parse(url);
  } catch (error) {
    const response = await axios.get(url).catch(error => {
      throw "HTTP Request for NFT Error:" + error;
    });
    if (isObject(response)) {
      return response;
    } else {
      throw "NFT Data Improperly Formatted:" + url;
    }
  }
};
