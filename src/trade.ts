import { HISTORY } from "./constants";
import { Ticker, TradeStatus } from "./models";
import { getLastElement, roundNumber } from "./util";
import { Data } from "./data";

const ATR = require("technicalindicators").ATR;
const Stochastic = require("technicalindicators").Stochastic;

export class Trading {
  constructor(private data: Data) {}

  checkForTrade(ticker: Ticker): boolean {
    const highArray = ticker.ohlc.map((k) => k.high);
    const lowArray = ticker.ohlc.map((k) => k.low);
    const closeArray = ticker.ohlc.map((k) => k.close);
    const inputLong = {
      high: highArray,
      low: lowArray,
      close: closeArray,
      period: HISTORY,
    };
    const inputShort = {
      high: highArray,
      low: lowArray,
      close: closeArray,
      period: 1,
    };
    const stochInput = {
      high: highArray,
      low: lowArray,
      close: closeArray,
      period: 8,
      signalPeriod: 3,
    };

    const atrShort = ATR.calculate(inputShort);
    const atrLong = ATR.calculate(inputLong);
    const stoch = Stochastic.calculate(stochInput);
    const xbarLow = (x: number) =>
      Math.min(...lowArray.filter((k, i) => i > lowArray.length - x));
    const xbarHigh = (x: number) =>
      Math.max(...highArray.filter((k, i) => i > highArray.length - x));

    const lastPrice = getLastElement(closeArray);

    if (
      getLastElement(atrShort) >= getLastElement(atrLong) &&
      lastPrice <= xbarLow(HISTORY) &&
      getLastElement(stoch).k < 5
    ) {
      console.log(
        ticker.symbol_binance,
        `BUY ACTIVATED... WAITING FOR RIGHT MOMENT TO BUY`
      );
      this.data.changeTickerParam(ticker.symbol_binance, {
        tradeStatus: TradeStatus.TRIGGERED,
      });
    }

    // TRIGGER A BUY

    if (
      ticker.tradeStatus === TradeStatus.TRIGGERED &&
      getLastElement(stoch).k > getLastElement(stoch).d
    ) {
      this.data.changeTickerParam(ticker.symbol_binance, {
        tradeStatus: TradeStatus.READY,
        lastTradeDate: Date.now(),
      });
      return true;
    }

    return false;
  }
}
