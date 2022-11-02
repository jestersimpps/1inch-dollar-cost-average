import { InchApi } from "./1inch-api";
import { mapToOhlc } from "./util";
import { binance, Data } from "./data";
import { Ticker, Token, TradeStatus } from "./models";
import {
  CANDLES_TIMEFRAME,
  PAIRS_BINANCE,
  PAIRS_1INCH,
  CHECK_INTERVAL,
  BASECURRENCY,
  DOLLAR_AMOUNT_PER_PURCHASE,
  TIME_BEFORE_NEXT_PURCHASE,
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
    const tokenList = await this.inchApi.getTokenList(BASECURRENCY);
    this.data.getTickerArray().forEach((ticker) => {
      const token = tokenList.find((token) => token.pair === ticker.token.pair);
      if (token) {
        this.data.changeTickerParam(ticker.symbol_binance, {
          token,
        });
      } else {
        console.error(
          `can't find pair: ${ticker.token.pair} in 1inch token list`
        );
      }
    });
  }

  private check() {
    this.data.getTickerArray().forEach(async (ticker) => {
      if (ticker.token.address) {
        if (ticker.lastTradeDate < Date.now() - TIME_BEFORE_NEXT_PURCHASE) {
          const isLong = this.trading.checkForLong(ticker);
          const isShort = this.trading.checkForShort(ticker);
          if (isShort) {
            const avgBuyingPrice = await this.data.getAverageLong(
              ticker.symbol_binance
            );
            if (+ticker.token.price > avgBuyingPrice) {
              this.inchApi
                .swap(
                  ticker.token,
                  BASECURRENCY,
                  DOLLAR_AMOUNT_PER_PURCHASE / ticker.price_binance,
                  true
                )
                .then((success) => {
                  if (success) {
                    this.data.clearLongData(ticker.symbol_binance);
                    sendPrivateTelegramMessage(
                      `Sold $${DOLLAR_AMOUNT_PER_PURCHASE} of ${ticker.symbol_binance} at ${ticker.price_binance}`
                    );
                  }
                });
            } else {
              sendPrivateTelegramMessage(
                `Consider sell ${ticker.symbol_binance} at ${ticker.price_binance}`
              );
            }
          }
          if (isLong) {
            this.inchApi
              .swap(
                BASECURRENCY,
                ticker.token,
                DOLLAR_AMOUNT_PER_PURCHASE,
                true
              )
              .then((success) => {
                if (success) {
                  this.data.addLong(
                    ticker.symbol_binance,
                    +ticker.token.price
                  );
                  sendPrivateTelegramMessage(
                    `Bought $${DOLLAR_AMOUNT_PER_PURCHASE} of ${ticker.symbol_binance} at ${ticker.price_binance}`
                  );
                }
              });
          }
        }
      }
    });
    console.log(``);
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
          `timeout:`,
          Date.now() - TIME_BEFORE_NEXT_PURCHASE - t.lastTradeDate
        )
      );
  }

  async init() {
    this.data.setTickerArray(
      PAIRS_BINANCE.map((s, i) => ({
        symbol_binance: s,
        price_binance: null,
        token: { pair: PAIRS_1INCH[i] } as Token,
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
