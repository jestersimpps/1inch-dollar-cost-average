require("dotenv").config();

export const BASE_URL = `https://api.1inch.exchange/v4.0`;
export const RPC_PROVIDER = `https://rpc-mainnet.maticvigil.com/v1/1697a4350bd5369ddcee70f5a62a2b90ad4b1c52`;
export const WEI_DECIMALS = 1000000000000000000;

export const PAIRS_1INCH: string[] = JSON.parse(process.env.PAIRS_1INCH);
export const PAIRS_BINANCE: string[] = JSON.parse(process.env.PAIRS_BINANCE);
export const REFRESH_INTERVAL = +process.env.REFRESH_INTERVAL * 60; // wait timeout before new order
export const CHECK_INTERVAL = 1000 * 5; // interval to check for new opportunities
export const CANDLES_TIMEFRAME = process.env.CANDLES_TIMEFRAME;
export const DOLLAR_AMOUNT_PER_PURCHASE =
  +process.env.DOLLAR_AMOUNT_PER_PURCHASE; // size of dollar cost average order in USD
export const HISTORY = 100; // check this many ticks candles for break
export const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
export const BASECURRENCY = {
  name: `USDC`,
  symbol: `USDC`,
  address: `0x2791bca1f2de4661ed88a30c99a7a9449aa84174`,
  decimals: 6,
};
