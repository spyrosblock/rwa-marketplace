import React, { FC, ReactNode, useState } from "react";
import { Box } from "@chakra-ui/react";

interface Props {
  title: ReactNode | string;
  className?: string;
  open?: boolean;
  children: ReactNode;
  onClick?: () => void;
}

const Accordion: FC<Props> = ({ title, children, onClick, className = "", open = false }) => {
  const classes = className + " " + `collapse collapse-arrow shadow-md overflow-hidden`;
  const [isOpen, setIsOpen] = useState(open);
  const toggleOpen = () => {
    setIsOpen(!isOpen);
    onClick && onClick();
  };
  return (
    <Box className={classes} onClick={toggleOpen} rounded="lg">
      <input type="checkbox" checked={isOpen} readOnly />
      <div className="collapse-title text-large font-medium pl-12 flex justify-center items-start">
        <div className="flex flex-row">{title}</div>
      </div>
      <div className="collapse-content overflow-hidden">{children}</div>
    </Box>
  );
};

export default Accordion;
