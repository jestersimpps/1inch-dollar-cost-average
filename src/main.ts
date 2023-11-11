import { InchApi } from "./1inch-api";
import { mapToOhlc, roundNumber } from "./util";
import { binance, Data } from "./data";
import { Token, TradeStatus } from "./models";
import {
 CANDLES_TIMEFRAME,
 PAIRS_BINANCE,
 SYMBOLS_1INCH,
 CHECK_INTERVAL,
 AMOUNT_PER_PURCHASE,
 TIME_BEFORE_NEXT_PURCHASE,
 BASE_SYMBOL_BINANCE,
} from "./constants";
import { Trading } from "./trade";
import { sendPrivateTelegramMessage } from "./telegram";

export class Main {
 constructor(
  private data: Data,
  private inchApi: InchApi,
  private trading: Trading
 ) {}

 private listenToChartUpdates() {
  this.data.getTickerArray().forEach((ticker) =>
   binance.websockets.chart(
    ticker.symbol_binance,
    CANDLES_TIMEFRAME,
    (symbol, interval, chart) => {
     const chartObject = mapToOhlc(chart);
     if (chartObject.length) {
      const lastPrice = chartObject[chartObject.length - 1].close;
      this.data.changeTickerParam(symbol, {
       price_binance: lastPrice,
       ohlc: chartObject,
      });
     }
    }
   )
  );
 }

 private async update1InchPairs() {
  const tokenList = await this.inchApi.getTokenList();
  this.data.getTickerArray().forEach((ticker) => {
   const token = tokenList.find(
    (token) => token.symbol === ticker.token.symbol
   );
   if (token) {
    this.data.changeTickerParam(ticker.symbol_binance, {
     token,
    });
   } else {
    console.error(
     `can't find symbol: ${ticker.token.symbol} in 1inch token list`
    );
   }
  });
 }

 private check() {
  const quoteToken = this.inchApi.getQuoteToken();
  this.data.getTickerArray().forEach(async (ticker) => {
   if (ticker.token.address) {
    if (ticker.lastTradeDate < Date.now() - TIME_BEFORE_NEXT_PURCHASE) {
     const isLong = this.trading.checkForLong(ticker);
     const isShort = this.trading.checkForShort(ticker);
     if (isShort) {
      const txHash = await this.inchApi.performSwap(
       ticker.token,
       quoteToken,
       AMOUNT_PER_PURCHASE
      );
      // const avgBuyingPrice = await this.data.getAverageLong(
      //  ticker.symbol_binance
      // );
      // const orders = await this.data.getOrders(ticker.symbol_binance);
      // const amount = orders.length * DOLLAR_AMOUNT_PER_PURCHASE;
      // const hasEnoughBalance =
      //  ticker.token.pair.indexOf("MATIC") && ticker.token.balance > 100;
      // if (+ticker.token.price > avgBuyingPrice * 1.01 && hasEnoughBalance) {
      //  this.inchApi
      //   .swap(
      //    ticker.token,
      //    BASECURRENCY,
      //    DOLLAR_AMOUNT_PER_PURCHASE / ticker.price_binance,
      //    true
      //   )
      //   .then(async (success) => {
      //    if (success) {
      // this.data.clearLongData(ticker.symbol_binance);
      if (txHash) {
       sendPrivateTelegramMessage(
        `Sell ${ticker.symbol_binance} at ${ticker.price_binance}: https://polygonscan.com/tx/${txHash}`
       );
      } else {
       sendPrivateTelegramMessage(
        `Sell ${ticker.symbol_binance} at ${ticker.price_binance} failed`
       );
      }
      //    } else {
      //     this.sendStatusMessage(ticker, avgBuyingPrice, amount);
      //    }
      //   });
      // } else {
      //  this.sendStatusMessage(ticker, avgBuyingPrice, amount);
      // }
     }
     if (isLong) {
      const txHash = await this.inchApi.performSwap(
       quoteToken,
       ticker.token,
       AMOUNT_PER_PURCHASE * +ticker.token.price
      );

      // this.inchApi
      //  .swap(BASECURRENCY, ticker.token, DOLLAR_AMOUNT_PER_PURCHASE, true)
      //  .then((success) => {
      //   if (success) {
      // this.data.addLong(ticker.symbol_binance, +ticker.token.price);
      if (txHash) {
       sendPrivateTelegramMessage(
        `Buy ${ticker.symbol_binance} at ${ticker.price_binance}: https://polygonscan.com/tx/${txHash}`
       );
      } else {
       sendPrivateTelegramMessage(
        `Buy ${ticker.symbol_binance} at ${ticker.price_binance} failed`
       );
      }
      //   }
      //  });
     }
    }
   }
  });
  this.data
   .getTickerArray()
   .sort((a, b) => a.symbol_binance.localeCompare(b.symbol_binance))
   .forEach((t) =>
    console.log(
     t.symbol_binance,
     `binance price:`,
     t.price_binance,
     `1inch price:`,
     t.token.price,
     `balance:`,
     t.token.balance,
     `quote balance:`,
     quoteToken.balance,
     `timeout:`,
     Date.now() - TIME_BEFORE_NEXT_PURCHASE - t.lastTradeDate
    )
   );
 }

 private sendStatusMessage(ticker, avgBuyingPrice, amount) {
  sendPrivateTelegramMessage(
   `${ticker.token.pair} ${amount} at ${roundNumber(
    (ticker.token.price / avgBuyingPrice) * 100 - 100,
    0.1
   )}% avg: ${roundNumber(avgBuyingPrice, 0.01)} current:${roundNumber(
    ticker.token.price,
    0.01
   )}`
  );
 }

 async init() {
  // sendPrivateTelegramMessage(`bot started`);
  this.data.setTickerArray(
   PAIRS_BINANCE.map((s, i) => ({
    symbol_binance: `${s}${BASE_SYMBOL_BINANCE}`,
    price_binance: null,
    token: { symbol: SYMBOLS_1INCH[i] } as Token,
    lastTradeDate: Date.now() - TIME_BEFORE_NEXT_PURCHASE,
    tradeStatus: TradeStatus.READY,
    ohlc: [],
   }))
  );

  this.listenToChartUpdates();

  setInterval(() => this.update1InchPairs(), CHECK_INTERVAL);
  setTimeout(
   () => setInterval(() => this.check(), CHECK_INTERVAL),
   CHECK_INTERVAL
  );
 }
}

const data = new Data();
const trade = new Trading(data);
const inchApi = new InchApi();
const main = new Main(data, inchApi, trade);

main.init();
