"use client";

import { TokenSaleWidget } from "./TokenSaleWidget";

const DirtDaoPage = () => {
  return (
    <div className="flex flex-col gap-6 py-8 px-4 lg:px-8 min-h-screen">
      <h1 className="text-4xl font-bold text-center mb-8">DirtDAO Token Sale</h1>
      <div className="flex flex-col items-center gap-4 bg-base-100 shadow-lg rounded-2xl p-6 w-full max-w-lg mx-auto">
        <TokenSaleWidget />
      </div>
    </div>
  );
};

export default DirtDaoPage;
