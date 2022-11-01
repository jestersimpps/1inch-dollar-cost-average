import {  ethers } from "ethers";
const BigNumber = require('bignumber.js');
import { Chain, Token } from "./models";
import axios from "axios";
import { BASE_URL, RPC_PROVIDER, WEI_DECIMALS } from "./constants";
import {
  getListUrl,
  getBalanceURL,
  getTokenPricesUrl,
  getSwapUrl,
  getScannerUrl,
} from "./util";

const MATIC_PROVIDER = new ethers.providers.JsonRpcProvider(RPC_PROVIDER); //rpc can be replaced with an ETH or BSC RPC
const wallet = new ethers.Wallet(
  `0x${process.env.PRIVATE_KEY}`,
  MATIC_PROVIDER
); //connect the matic provider along with using the private key as a signer

export class InchApi {
  constructor() {}

  async getTokenList(
    quoteToken: Partial<Token>,
    chain: Chain | string = Chain.Polygon
  ): Promise<Token[]> {
    try {
      const listUrl = getListUrl(chain);
      const tokenObject = (await axios.get(listUrl)).data.tokens;
      const balanceURL = getBalanceURL(chain, process.env.PUBLIC_KEY);
      const balances = (await axios.get(balanceURL)).data;
      const tokens: Token[] = Object.keys(tokenObject).map((t: string) => ({
        pair: `${tokenObject[t].symbol}${quoteToken.name}`,
        ...tokenObject[t],
      }));
      const tokenPricesUrl = getTokenPricesUrl(chain);
      const response = (await axios.get(tokenPricesUrl)).data;
      const tokenPrices = response.message
        ? new Error(response.message)
        : response;
      const usdcPrice = +tokenPrices[quoteToken.address] / WEI_DECIMALS;

      for (const token of tokens) {
        token.price =
          (+tokenPrices[token.address] / WEI_DECIMALS) * (1 / usdcPrice);
        token.balance = +balances[token.address].balance
          ? +balances[token.address].balance / Math.pow(10, +token.decimals)
          : 0;
        token.allowance = +balances[token.address].allowance
          ? +balances[token.address].allowance / Math.pow(10, +token.decimals)
          : 0;
      }
      return tokens;
    } catch {
      return [];
    }
  }

  async swap(
    fromToken: Partial<Token>,
    toToken: Partial<Token>,
    amount: number,
    force = false,
    slippage = 1,
    chain: Chain | string = Chain.Polygon
  ): Promise<string> {
    try {
      //TODO: clean code -callback hell
      const wei = new BigNumber(amount).shiftedBy(fromToken.decimals).toFixed();
      console.log(wei);
      const url = getSwapUrl(
        chain,
        process.env.PUBLIC_KEY,
        fromToken.address,
        toToken.address,
        wei,
        slippage
      );
      const response = await axios.get(url);

      if (response.status === 200) {
        const tokenObject = response.data;
        // get max fees from gas station
        let maxFeePerGas = ethers.BigNumber.from(4000000000); // fallback to 40 gwei
        let maxPriorityFeePerGas = ethers.BigNumber.from(4000000000); // fallback to 40 gwei
        try {
          const { data } = await axios({
            method: "get",
            url: "https://gasstation-mainnet.matic.network/v2",
          });
          maxFeePerGas = ethers.utils.parseUnits(
            Math.ceil(data.fast.maxFee) + "",
            "gwei"
          );
          maxPriorityFeePerGas = ethers.utils.parseUnits(
            Math.ceil(data.fast.maxPriorityFee) + "",
            "gwei"
          );
        } catch {
          // ignore
        }
        // console.log(tokenObject);
        // console.log(tokenObject["tx"]["value"]);
        // console.log(ethers.BigNumber.from(wei)._hex);

        const transaction = {
          from: tokenObject["tx"].from,
          to: tokenObject["tx"].to,
          data: tokenObject["tx"].data,
          value: ethers.BigNumber.from(tokenObject["tx"].value),
          maxPriorityFeePerGas,
          maxFeePerGas,
        };
        console.log(transaction);

        return new Promise((resolve, reject) => {
          const trySwap = async () =>
            wallet
              .sendTransaction(transaction)
              .then((swap) => {
                if (swap) {
                  const scannerUrl = getScannerUrl(swap);
                  console.log(
                    `SWAP ${amount} ${fromToken.symbol} to ${toToken.symbol}`
                  );
                  if (swap["hash"]) {
                    if (force) {
                      const checkInterval = setInterval(async () => {
                        axios
                          .get(scannerUrl)
                          .then((response) => {
                            if (response.data?.result?.status === 0) {
                              console.warn(
                                `SWAP ${amount} ${fromToken.symbol} to ${toToken.symbol} - SWAP failed, retrying...`
                              );
                              clearInterval(checkInterval);
                              trySwap();
                            }
                            if (response.data?.result?.status === 1) {
                              console.log(
                                `SWAP ${amount} ${fromToken.symbol} to ${toToken.symbol} - SWAP succeeded.`
                              );
                              clearInterval(checkInterval);
                              resolve(scannerUrl);
                            }
                            if (response.data?.result?.status === "") {
                              console.log(
                                `SWAP ${amount} ${fromToken.symbol} to ${toToken.symbol} - transaction pending...`
                              );
                            }
                          })
                          .catch((e) => {
                            console.error(
                              `SWAP ${amount} ${fromToken.symbol} to ${toToken.symbol} - SWAP failed: ${e}`
                            );
                            clearInterval(checkInterval);
                            trySwap();
                          });
                      }, 10 * 1000);
                    } else {
                      resolve(scannerUrl);
                    }
                  } else {
                    console.error("no swap hash");
                    resolve(null);
                  }
                }
              })
              .catch((e) => {
                console.error(e);
                resolve(null);
              });
          trySwap();
        });
      } else {
        console.error(response.statusText);
        return null;
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async approve(
    tokenAddress: string,
    amount: number,
    chain: Chain | string = Chain.Polygon
  ): Promise<Token[]> {
    // TODO
    const tokenUrl = `${BASE_URL}/${chain}/approve/calldata`;
    const tokenObject = (await axios.get(tokenUrl)).data.tokens;
    return tokenObject
      ? Object.keys(tokenObject).map((t) => tokenObject[t])
      : [];
  }
}
