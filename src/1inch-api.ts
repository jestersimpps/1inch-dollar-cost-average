require("dotenv").config();

import axios from "axios";
import { Chain, SwapInfo, Token } from "./models";
import {
 SYMBOLS_1INCH,
 RPC_PROVIDER,
 BASE_SYMBOL_1INCH,
 WEI_DECIMALS,
} from "./constants";

const chainId = Chain.Polygon;
const web3RpcUrl = RPC_PROVIDER; // URL for rpc
const walletAddress = process.env.PUBLIC_KEY; // Your wallet address
const privateKey = process.env.PRIVATE_KEY; // Your wallet's private key. NEVER SHARE THIS WITH ANYONE!
const inchKey = process.env.INCH_KEY;

export class InchApi {
 private tokens: Token[] = [];
 private allPrices: { [address: string]: string };
 private allSymbols: string[] = [...SYMBOLS_1INCH, BASE_SYMBOL_1INCH];

 constructor() {}

 private async waitBeforeCall() {
  return new Promise((resolve) => {
   setTimeout(() => {
    resolve(null);
   }, 1000);
  });
 }

 private async getTokenBalances(
  walletAddress: string
 ): Promise<{ [address: string]: number }> {
  await this.waitBeforeCall();
  const endpoint = `https://api.1inch.dev/balance/v1.2/${chainId}/balances/${walletAddress}`;
  try {
   const response = await axios.get(endpoint, {
    headers: {
     accept: "application/json",
     Authorization: `Bearer ${inchKey}`,
    },
   });

   if (response.status === 200) {
    return response.data;
   } else {
    console.log(
     `Failed to fetch token balances. Error code: ${response.status}`
    );
    return null;
   }
  } catch (error) {
   console.error(`Failed to fetch token balances. Error: ${error}`);
   return null;
  }
 }

 private async searchToken(symbol: string): Promise<Token[]> {
  await this.waitBeforeCall();

  const endpoint = "https://api.1inch.dev/token/v1.2/137/search";
  const params = {
   query: symbol,
   ignore_listed: false,
   limit: 1,
  };

  try {
   const response = await axios.get(endpoint, {
    headers: {
     accept: "application/json",
     Authorization: `Bearer ${inchKey}`,
    },
    params: params,
   });
   return response.data;
  } catch (error) {
   if (axios.isAxiosError(error)) {
    console.error(
     `Error code: ${error.response?.status}. Message: ${error.response?.data}`
    );
   } else {
    console.error("An unexpected error occurred", error);
   }
   return null;
  }
 }

 private async getQuote(
  from: Token,
  to: Token,
  amount: number
 ): Promise<SwapInfo> {
  await this.waitBeforeCall();

  const endpoint = `https://api.1inch.dev/swap/v5.2/${chainId}/quote`;
  const swapParams = {
   src: from.address, // Token address of 1INCH
   dst: to.address, // Token address of DAI
   amount: amount * WEI_DECIMALS, // Amount of 1INCH to swap (in wei)
   from: walletAddress,
   slippage: 1, // Maximum acceptable slippage percentage for the swap (e.g., 1 for 1%)
   disableEstimate: false, // Set to true to disable estimation of swap details
   allowPartialFill: false, // Set to true to allow partial filling of the swap order
  };

  try {
   const response = await axios.get(endpoint, {
    headers: {
     accept: "application/json",
     Authorization: `Bearer ${inchKey}`,
    },
    params: swapParams,
   });
   return response.data;
  } catch (error) {
   if (axios.isAxiosError(error)) {
    console.error(
     `Error code: ${error.response?.status}. Message: ${error.response?.data}`
    );
   } else {
    console.error("An unexpected error occurred", error);
   }
   return null;
  }
 }

 private async refreshPrices(): Promise<{ [address: string]: string }> {
  await this.waitBeforeCall();

  const endpoint = `https://api.1inch.dev/price/v1.1/${chainId}?currency=USD`;

  try {
   const response = await axios.get(endpoint, {
    headers: {
     accept: "application/json",
     Authorization: `Bearer ${inchKey}`,
    },
   });
   this.allPrices = response.data;
   return this.allPrices;
  } catch (error) {
   if (axios.isAxiosError(error)) {
    console.error(
     `Error code: ${error.response?.status}. Message: ${error.response?.data}`
    );
   } else {
    console.error("An unexpected error occurred", error);
   }
   return this.allPrices;
  }
 }

 private async initTokens() {
  for (const symbol of this.allSymbols) {
   const token = await this.searchToken(symbol);
   if (token?.[0]) {
    this.tokens.push(token[0]);
   }
  }
  return [];
 }

 async getTokenList(): Promise<Token[]> {
  if (!this.tokens.length) {
   return this.initTokens();
  }

  const balances = await this.getTokenBalances(walletAddress);
  const prices = await this.refreshPrices();

  if (!balances || !prices) {
   return [];
  }

  let lastTokens: Token[] = [];

  for (const symbol of this.allSymbols) {
   const pairString = `${symbol}${BASE_SYMBOL_1INCH}`;
   const tradeToken = this.tokens.find((t) => t.symbol === symbol);
   const quoteToken = this.tokens.find((t) => t.symbol === BASE_SYMBOL_1INCH);
   const token: Token = {
    ...tradeToken,
    pair: pairString,
    price: +prices[tradeToken.address] / +prices[quoteToken.address],
    balance: +balances[tradeToken.address],
   };
   lastTokens.push(token);
  }
  this.tokens = lastTokens;
  return this.tokens;
 }
}
