import { InchApi } from "./1inch-api";
import { mapToOhlc, roundNumber } from "./util";
import { binance, Data } from "./data";
import { Token, TradeStatus } from "./models";
import {
 CANDLES_TIMEFRAME,
 SYMBOLS_BINANCE,
 SYMBOLS_1INCH,
 CHECK_INTERVAL,
 AMOUNT_PER_PURCHASE,
 TIME_BEFORE_NEXT_PURCHASE,
 BASE_SYMBOL_BINANCE,
} from "./constants";
import { Trading } from "./trade";
import { sendPrivateTelegramMessage } from "./telegram";

sendPrivateTelegramMessage(`Bot started`);
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
      const avgBuyingPrice = await this.data.getAverageLong(
       ticker.symbol_binance
      );
      const orders = await this.data.getOrders(ticker.symbol_binance);
      const hasEnoughBalance =
       ticker.token.balance > AMOUNT_PER_PURCHASE / +ticker.token.price;
      const isInProfit = orders.length
       ? +ticker.token.price > avgBuyingPrice * 1.01
       : true;

      if (isInProfit && hasEnoughBalance) {
       const tx = await this.inchApi.performSwap(
        ticker.token,
        quoteToken,
        AMOUNT_PER_PURCHASE / +ticker.token.price
       );
       if (tx.txHash) {
        await this.data.reduceLongData(ticker.symbol_binance);
        sendPrivateTelegramMessage(
         `Sell ${ticker.symbol_binance} at ${ticker.price_binance}: https://polygonscan.com/tx/${tx.txHash}`
        );
       } else {
        sendPrivateTelegramMessage(
         `Sell ${ticker.symbol_binance} at ${ticker.price_binance} failed, error: ${tx.error}`
        );
       }
      } else {
       sendPrivateTelegramMessage(
        `Sell ${ticker.symbol_binance} at ${ticker.price_binance} failed, balance: ${ticker.token.balance}, profit: ${isInProfit}, enough balance: ${hasEnoughBalance}`
       );
      }
     }

     if (isLong) {
      const tx = await this.inchApi.performSwap(
       quoteToken,
       ticker.token,
       AMOUNT_PER_PURCHASE
      );

      if (tx.txHash) {
       await this.data.addLong(ticker.symbol_binance, +ticker.token.price);
       sendPrivateTelegramMessage(
        `Buy ${ticker.symbol_binance} at ${ticker.price_binance}: https://polygonscan.com/tx/${txHash}`
       );
      } else {
       sendPrivateTelegramMessage(
        `Buy ${ticker.symbol_binance} at ${ticker.price_binance} failed, error: ${tx.error}`
       );
      }
     }
    }
   }
  });
  this.data
   .getTickerArray()
   .sort((a, b) => a.symbol_binance.localeCompare(b.symbol_binance))
   .forEach((t) =>
    console.log(
     new Date(),
     t.symbol_binance,
     `binance price:`,
     +t.price_binance,
     `1inch price:`,
     +t.token?.price,
     `balance:`,
     +t.token?.balance,
     `timeout:`,
     Date.now() - TIME_BEFORE_NEXT_PURCHASE - t.lastTradeDate > 0
      ? "ready"
      : "wait",
     `status:`,
     t.tradeStatus
    )
   );
 }

 async init() {
  // sendPrivateTelegramMessage(`bot started`);
  this.data.setTickerArray(
   SYMBOLS_BINANCE.map((s, i) => ({
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
