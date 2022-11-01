import { InchApi } from "./1inch-api";
import { mapToOhlc } from "./util";
import { binance, Data } from "./data";
import { Ticker, Token, TradeStatus } from "./models";
import {
  CANDLES_TIMEFRAME,
  PAIRS_BINANCE,
  PAIRS_1INCH,
  REFRESH_INTERVAL,
  CHECK_INTERVAL,
  BASECURRENCY,
  DOLLAR_AMOUNT_PER_PURCHASE,
} from "./constants";
import { sendPrivateTelegramMessage } from "./telegram";
import { Trading } from "./trade";

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
    this.data.getTickerArray().forEach((ticker) => {
      if (ticker.token.address) {
        if (ticker.lastTradeDate < Date.now() - REFRESH_INTERVAL * 1000 * 60) {
          const isLong = this.trading.checkForTrade(ticker);
          if (isLong) {
            this.inchApi.swap(
              BASECURRENCY,
              ticker.token,
              DOLLAR_AMOUNT_PER_PURCHASE,
              true
            );
            sendPrivateTelegramMessage(
              `Bought $${DOLLAR_AMOUNT_PER_PURCHASE} of ${ticker.symbol_binance} at ${ticker.price_binance}`
            );
          }
        }
      }
    });

    console.log(
      this.data.getTickerArray().map((t) => ({
        symbol: t.symbol_binance,
        binance: t.price_binance,
        ["1inch"]: t.token.price,
        balance: t.token.balance,
      }))
    );
  }

  async init() {
    this.data.setTickerArray(
      PAIRS_BINANCE.map((s, i) => ({
        symbol_binance: s,
        price_binance: null,
        token: { pair: PAIRS_1INCH[i] } as Token,
        lastTradeDate: Date.now() - REFRESH_INTERVAL * 1000 * 60,
        tradeStatus: TradeStatus.READY,
        ohlc: [],
      }))
    );

    this.listenToChartUpdates();

    setInterval(() => this.update1InchPairs(), CHECK_INTERVAL);
    setInterval(() => this.check(), CHECK_INTERVAL);
  }
}

const data = new Data();
const trade = new Trading(data);
const inchApi = new InchApi();
const main = new Main(data, inchApi, trade);

main.init();
