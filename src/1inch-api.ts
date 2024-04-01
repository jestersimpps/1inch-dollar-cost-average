require("dotenv").config();
import Web3 from "web3";
import axios from "axios";
import { Chain, SwapInfo, Token } from "./models";
import {
 SYMBOLS_1INCH,
 RPC_PROVIDER,
 BASE_SYMBOL_1INCH,
 WEI_DECIMALS,
} from "./constants";
import {
 convertFromWei,
 convertToWei,
 divideBigNUmbers,
 roundNumber,
 roundToDecimals,
} from "./util";
import { BigNumber } from "ethers";

const chainId = Chain.Polygon;
const web3RpcUrl = RPC_PROVIDER; // URL for rpc
const walletAddress = process.env.PUBLIC_KEY; // Your wallet address
const privateKey = process.env.PRIVATE_KEY; // Your wallet's private key. NEVER SHARE THIS WITH ANYONE!
const inchKey = process.env.INCH_KEY;
const web3 = new Web3(web3RpcUrl);

export class InchApi {
 private tokens: Token[] = [];
 private allPrices: { [address: string]: string };
 private allSymbols: string[] = [...SYMBOLS_1INCH, BASE_SYMBOL_1INCH];

 constructor() {}

 private async waitBeforeCall(time = 1000) {
  return new Promise((resolve) => {
   setTimeout(() => {
    resolve(null);
   }, time);
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
     `Error code: ${error.response?.status}. Message: ${JSON.stringify(
      error.response?.data
     )}`
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
   src: from.address,
   dst: to.address,
   amount: convertToWei(amount, from.decimals), // Amount of 1INCH to swap (in wei)
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
     `Error code: ${error.response?.status}. Message: ${JSON.stringify(
      error.response?.data
     )}`
    );
   } else {
    console.error("An unexpected error occurred", error);
   }
   return null;
  }
 }

 private async getSwapTransaction(
  from: Token,
  to: Token,
  amount: number
 ): Promise<SwapInfo> {
  await this.waitBeforeCall(3000);

  const endpoint = `https://api.1inch.dev/swap/v5.2/${chainId}/swap`;

  // console.log(convertToWei(amount, from.decimals));

  const swapParams = {
   src: from.address,
   dst: to.address,
   amount: convertToWei(amount, from.decimals), // Amount of 1INCH to swap (in wei)
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
     `Error code: ${error.response?.status}. Message: ${JSON.stringify(
      error.response?.data
     )}`
    );
   } else {
    console.error("An unexpected error occurred", error);
   }
  }
  return null;
 }

 public getQuoteToken(): Token {
  return this.tokens.find((t) => t.symbol === BASE_SYMBOL_1INCH);
 }

 public async performSwap(
  from: Token,
  to: Token,
  amount: number
 ): Promise<{ txHash: null | string; error: null | string }> {
  await this.waitBeforeCall();
  try {
   const transaction = await this.getSwapTransaction(from, to, amount);
   if (!transaction)
    return { txHash: null, error: "Failed to get transaction" };

   const { rawTransaction } = await web3.eth.accounts.signTransaction(
    transaction?.tx,
    privateKey
   );

   //  console.log("Sending transaction: " + rawTransaction);

   const broadcastEndpoint =
    "https://api.1inch.dev/tx-gateway/v1.1/" + chainId + "/broadcast";

   await this.waitBeforeCall(2000);
   const response = await axios.post(
    broadcastEndpoint,
    { rawTransaction },
    {
     headers: {
      accept: "application/json",
      Authorization: `Bearer ${inchKey}`,
     },
    }
   );
   const transactionHash = response.data.transactionHash;
   console.log("New transaction: " + transactionHash);
   return { txHash: transactionHash, error: null };
  } catch (error) {
   if (axios.isAxiosError(error)) {
    console.error(
     `Error code: ${error.response?.status}. Message: ${JSON.stringify(
      error.response?.data
     )}`
    );
   } else {
    console.error("An unexpected error occurred", error);
   }
   return {
    txHash: null,
    error: "Failed to perform swap: " + JSON.stringify(error),
   };
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
  console.log(this.tokens.map((t) => t.symbol));

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
    price: roundToDecimals(
     divideBigNUmbers(+prices[tradeToken.address], +prices[quoteToken.address]),
     tradeToken.decimals
    ),
    balance: convertFromWei(+balances[tradeToken.address], tradeToken.decimals),
   };
   lastTokens.push(token);
  }

  this.tokens = lastTokens;
  return this.tokens;
 }
}
