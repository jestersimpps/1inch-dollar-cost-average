export interface Token {
  symbol: string;
  pair: string;
  name: string;
  decimals: number;
  address: string;
  logoURI: string;
  price: number;
  balance: number;
  allowance: number;
}

export enum Chain {
  "Ethereum" = 1,
  "Polygon" = 137,
  "BinanceSmartChain" = 56,
}

export enum TradeStatus {
  READY = "READY",
  WAITING_FOR_BUY = "WAITING_FOR_BUY",
  WAITING_FOR_SELL = "WAITING_FOR_SELL",
}

export interface Ticker {
  symbol_binance: string;
  price_binance: number;
  token: Token;
  lastTradeDate: number;
  tradeStatus: TradeStatus;
  ohlc: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
}
