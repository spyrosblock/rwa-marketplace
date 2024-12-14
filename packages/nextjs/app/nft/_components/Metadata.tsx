"use client";

import { FC, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { isObject } from "lodash";
import styled from "styled-components";
import { Input } from "~~/components";
import Alert from "~~/components/Alert";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { singleUpload } from "~~/services/ipfs";

const JsonViewDynamic = dynamic(() => import("@microlink/react-json-view"), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

const StyledWrapper = styled.div`
  .copy-to-clipboard-container,
  .click-to-edit {
    position: absolute;
    margin-top: -4px;
  }

  .click-to-edit {
    margin-left: 1px;
    margin-top: 12px;
  }

  .click-to-add {
    padding-left: 15px;
    margin-top: -4px;
  }
`;

interface Props {
  tokenId: string | number;
  json: object;
  isDirectJson?: boolean;
}

const Metadata: FC<Props> = ({ json, tokenId, isDirectJson }) => {
  const jsonElement = useRef<HTMLInputElement>(null);
  const [advanced, setAdvanced] = useState<boolean>();
  const [isMining, setIsMining] = useState<boolean>();
  const [jsonEdit, setJsonEdit] = useState<boolean>();
  const [jsonMsg, setJsonMsg] = useState<string>();
  const [jsonError, setJsonError] = useState<string>();
  const [jsonData, setJsonData] = useState<any>(json);

  const { writeContractAsync: writeToNftFacotry } = useScaffoldWriteContract("NFTFactory");

  const handleJsonSubmit = async () => {
    try {
      // handles both advanced and react-json-view data sources
      const jsonForUpdate = jsonData?.updated_src || jsonData;
      setIsMining(true);

      let tokenURIValue: string;
      console.log("jsonForUpdate", jsonForUpdate, isDirectJson, writeToNftFacotry);

      if (isDirectJson) {
        // For direct JSON, validate and stringify the JSON
        try {
          // Ensure it's valid JSON by parsing and stringifying
          tokenURIValue = JSON.stringify(jsonForUpdate);
        } catch (error) {
          setJsonError("Invalid JSON format");
          setIsMining(false);
          return;
        }
      } else {
        // For IPFS URL, upload the JSON to IPFS first
        const d = new Date();
        const datestring =
          d.getMonth() + 1 + "-" + d.getDate() + "-" + d.getFullYear() + " " + d.getHours() + ":" + d.getMinutes();
        const newUploadPath = (jsonForUpdate.name || "metadata") + " " + datestring;

        try {
          tokenURIValue = await singleUpload(JSON.stringify(jsonForUpdate), newUploadPath, () => {
            throw new Error("Error saving to IPFS");
          });
        } catch (error) {
          setJsonError("Error saving to IPFS");
          setIsMining(false);
          return;
        }
      }

      // Set the token URI on the contract
      const blockResponse = await writeToNftFacotry({
        functionName: "updateNFT",
        args: [tokenId, "", tokenURIValue],
      });

      console.log("block res", blockResponse);
      setIsMining(false);

      if (blockResponse) {
        setJsonEdit(false);
        setJsonMsg("Success 🥳 reload the page to see updates - may take a minute");
      } else {
        setJsonError("Error saving info to token, try again");
      }
    } catch (error) {
      console.error("Error in handleJsonSubmit:", error);
      setJsonError("Error saving changes. Please try again.");
      setIsMining(false);
    }
  };

  const handleJsonEdit = (json: any) => {
    setJsonEdit(true);
    let mutableJson;
    // allows for json from the input event
    if (json?.target?.value) {
      try {
        mutableJson = JSON.parse(json.target.value);
        console.log("success edit", mutableJson);
        setJsonData(mutableJson);
        setJsonError("");
      } catch (error) {
        console.log("error");
        setJsonError("update was not valid json");
      }
    } else {
      // allows for json from the react json view
      mutableJson = { ...json };
      if (json.name === "attributes" || json.namespace[0] === "attributes") {
        console.log("has attributes");
        try {
          const formatedAttributes = json.updated_src.attributes
            .filter((att: any) => att)
            .map((att: any) => {
              return isObject(att) ? att : JSON.parse(att);
            });
          mutableJson = { ...json, updated_src: { ...json.updated_src, attributes: formatedAttributes } };
        } catch (error) {
          console.error("Error formating JSON", error);
          setJsonError(`Invalid JSON: ${json.new_value}`);
          throw "Error formating JSON";
        }
      }
      setJsonData(mutableJson);
      setJsonError("");
    }
  };

  return (
    // stop propagation to avoid closing the accordion that this is housed in on the nft page
    <div className={`${isMining ? "faded pointer-events-none" : ""}`} onClick={e => e.stopPropagation()}>
      <span className="text-xs leading-5 text-gray-400 flex justify-center mb-6">
        ⚠️ this is an&nbsp;<span onClick={() => setAdvanced(!advanced)}>advanced feature</span> - edit at your own risk
        ⚠️
      </span>
      {advanced ? (
        <>
          <Input onChange={handleJsonEdit} textarea rows={10} value={JSON.stringify(jsonData, undefined, 4)} />
        </>
      ) : (
        <StyledWrapper ref={jsonElement}>
          <JsonViewDynamic
            src={json}
            name="metadata"
            onEdit={handleJsonEdit}
            collapseStringsAfterLength={30}
            displayDataTypes={false}
            quotesOnKeys={false}
            onAdd={console.log}
          />
        </StyledWrapper>
      )}
      {jsonMsg && <Alert type="success" message={jsonMsg} />}
      {jsonEdit && (
        <div className="mt-6 flex items-center justify-end space-x-2">
          {jsonError && <Alert type="error" message={jsonError} />}
          <button
            type="submit"
            className={`btn btn-success ${jsonError ? "faded pointer-events-none" : ""}`}
            onClick={handleJsonSubmit}
          >
            {isMining ? <span className="loading loading-spinner"></span> : "Save"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Metadata;
