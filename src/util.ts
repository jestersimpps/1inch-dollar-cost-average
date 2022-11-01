import { BASE_URL, POLYGONSCAN_API_KEY } from "./constants";
import { Chain } from "./models";

export const roundNumber = (value: number, precision: number) =>
  +parseFloat(
    (+value || 0).toFixed(
      precision.toString().length < 2 ? 0 : precision.toString().length - 2
    )
  );

export const getLastElement = (array: any[], n = 1) => {
  return array.length ? array[array.length - n] : null;
};

export const mapToOhlc = (chart) =>
  Object.keys(chart).map((k, i) => ({
    time: +k,
    open: +chart[k]["open"],
    high: +chart[k]["high"],
    low: +chart[k]["low"],
    close: +chart[k]["close"],
    volume: +chart[k]["volume"],
  }));

export const getBalanceURL = (chain: Chain | string, publictKey: string) =>
  `https://balances.1inch.exchange/v1.1/${chain}/allowancesAndBalances/0x11111112542d85b3ef69ae05771c2dccff4faa26/${publictKey}?tokensFetchType=listedTokens`;
export const getTokenPricesUrl = (chain: Chain | string) =>
  `https://token-prices.1inch.exchange/v1.1/${chain}`;
export const getSwapUrl = (
  chain: Chain | string,
  publictKey: string,
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: number,
  slippage: number
) =>
  `${BASE_URL}/${chain}/swap?fromAddress=${publictKey}&fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${amount}&slippage=${slippage}`;
export const getScannerUrl = (swap) =>
  `https://api.polygonscan.com/api?module=transaction&action=gettxreceiptstatus&txhash=${swap["hash"]}&apikey=${POLYGONSCAN_API_KEY}`;
export const getListUrl = (chain: Chain | string) =>
  `${BASE_URL}/${chain}/tokens`;
