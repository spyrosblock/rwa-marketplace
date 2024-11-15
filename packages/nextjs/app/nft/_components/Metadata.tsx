"use client";

import { FC, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { isObject } from "lodash";
import styled from "styled-components";
import { Input } from "~~/components";
import Alert from "~~/components/Alert";

// import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
// import { singleUpload } from "~~/services/ipfs";

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
}

const Metadata: FC<Props> = ({ json }) => {
  const jsonElement = useRef<HTMLInputElement>(null);
  const [advanced, setAdvanced] = useState<boolean>();
  const [isMining] = useState<boolean>();
  const [jsonEdit, setJsonEdit] = useState<boolean>();
  const [jsonMsg] = useState<string>();
  const [jsonError, setJsonError] = useState<string>();
  const [jsonData, setJsonData] = useState<any>(json);

  // const { writeContractAsync: writeTokenURI } = useScaffoldWriteContract("NFTFactory");

  const handleJsonSubmit = async () => {
    // TODO: refactor to use data that is on-chain vs ipfs
    // console.log("updates", jsonData);
    // // handles both advanced and react-json-view data sources
    // const jsonForUpdate = jsonData?.updated_src || jsonData;
    // setIsMining(true);
    // const d = new Date();
    // const datestring =
    //   d.getMonth() + 1 + "-" + d.getDate() + "-" + d.getFullYear() + " " + d.getHours() + ":" + d.getMinutes();
    // const newUploadPath = jsonForUpdate.name + " " + datestring;
    // const uploadHash = await singleUpload(JSON.stringify(jsonForUpdate), newUploadPath, () => {
    //   setJsonError("Error saving to IPFS");
    // });
    // const blockResponse = await writeTokenURI({
    //   functionName: "setTokenURI",
    //   args: [tokenId, uploadHash],
    // });
    // console.log("block res", blockResponse);
    // setIsMining(false);
    // if (blockResponse) {
    //   setJsonEdit(false);
    //   setJsonMsg("Success 🥳 reload the page to see updates - may take a minute");
    // } else {
    //   setJsonError("Error saving info to token, try again");
    // }
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
    <div className={`${isMining ? "faded pointer-events-none" : ""}`}>
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
