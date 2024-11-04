import React, { FC, ReactElement } from "react";
import { Input, InputGroup, InputRightElement, Text, Textarea } from "@chakra-ui/react";
import { capitalize } from "lodash";
import { Text as AppText } from "~~/components";

interface Props {
  name?: string;
  type?: string;
  placeholder?: string;
  label?: string;
  className?: string;
  value?: any;
  id?: string;
  autoComplete?: string;
  textarea?: boolean;
  rows?: number;
  note?: ReactElement | string | undefined;
  inputElement?: ReactElement;
  defaultValue?: any;
  groupedElemet?: ReactElement;
  onChange?: (e: any) => void;
}

export const Label = ({ htmlFor = "", children = "" }: { htmlFor?: string; children: ReactElement | string }) => (
  <Text as="label" htmlFor={htmlFor} className="block font-medium leading-6 text-sm capitalize">
    {children}
  </Text>
);

const ExportedInput: FC<Props> = ({
  name,
  id,
  type = "text",
  placeholder,
  autoComplete,
  textarea,
  rows,
  label,
  note,
  value,
  defaultValue,
  inputElement,
  groupedElemet,
  className,
  onChange,
}) => {
  value;
  const inputClasses =
    "block pl-4 flex-1 border-0 bg-transparent p-2 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6";
  return (
    <div className={"col-span-full" + " " + className}>
      {label !== "none" && <Label htmlFor={id || name}>{capitalize(label) || capitalize(name)}</Label>}
      <div>
        <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-full">
          {inputElement ? (
            inputElement
          ) : textarea ? (
            <Textarea
              name={name || id}
              onChange={onChange}
              value={value}
              defaultValue={defaultValue}
              id={id || name}
              rows={rows}
              minH={"120px"}
              autoComplete={autoComplete}
              className={inputClasses}
              placeholder={placeholder}
            />
          ) : (
            <InputGroup>
              <Input
                type={type}
                value={value}
                defaultValue={defaultValue}
                onChange={onChange}
                name={name}
                id={id || name}
                autoComplete={autoComplete || name}
                placeholder={placeholder}
              />
              {groupedElemet && <InputRightElement width={"fit-content"}>{groupedElemet}</InputRightElement>}
            </InputGroup>
          )}
        </div>
        {/* {note && <span className="text-xs leading-5 text-gray-400 block mb-2">{note}</span>} */}
        {note && (
          <AppText tiny display="block">
            {note}
          </AppText>
        )}
      </div>
    </div>
  );
};

export default ExportedInput;
