"use client";

export const DAPP_CHAIN = {
  chainId: 56,
  chainName: "BNB Smart Chain",
  nativeSymbol: "BNB",
  usdtSymbol: "USDT",
  usdtContractAddress:
    (process.env.NEXT_PUBLIC_BSC_USDT_CONTRACT || "0x55d398326f99059fF775485246999027B3197955").trim(),
};

export const ERC20_BALANCE_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];
