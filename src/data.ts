import { Ticker } from "./models";

const Binance = require("node-binance-api");

export const binance = new Binance().options({
  APIKEY: "<key>",
  APISECRET: "<secret>",
});

export class Data {
  private TICKERDATA = [];

  changeTickerParam = (
    symbol_binance: string,
    paramObject: Partial<Ticker>
  ) => {
    const oldTickerObject = this.TICKERDATA.find(
      (t) => t.symbol_binance === symbol_binance
    );
    const newTickerArray = this.TICKERDATA.filter(
      (t) => t.symbol_binance !== symbol_binance
    );
    this.TICKERDATA = [
      ...newTickerArray,
      { ...oldTickerObject, ...paramObject },
    ];
  };

  setTickerArray = (array: Ticker[]) => (this.TICKERDATA = array);
  getTickerArray = (): Ticker[] => this.TICKERDATA;
  getTicker = (symbol_binance: string): Ticker =>
    this.TICKERDATA.find((t) => t.symbol_binance === symbol_binance);
}
