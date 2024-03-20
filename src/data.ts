import { Ticker } from "./models";
const Binance = require("node-binance-api");
const Storage = require("node-storage");
const store = new Storage("data.json");

export const binance = new Binance().options({
 APIKEY: "<key>",
 APISECRET: "<secret>",
});

export class Data {
 private TICKERDATA = [];

 changeTickerParam = (symbol_binance: string, paramObject: Partial<Ticker>) => {
  const oldTickerObject = this.TICKERDATA.find(
   (t) => t.symbol_binance === symbol_binance
  );
  const newTickerArray = this.TICKERDATA.filter(
   (t) => t.symbol_binance !== symbol_binance
  );
  this.TICKERDATA = [...newTickerArray, { ...oldTickerObject, ...paramObject }];
 };

 setTickerArray = (array: Ticker[]) => (this.TICKERDATA = array);
 getTickerArray = (): Ticker[] => this.TICKERDATA;
 getTicker = (symbol_binance: string): Ticker =>
  this.TICKERDATA.find((t) => t.symbol_binance === symbol_binance);

 async addLong(symbol_binance: string, price: number) {
  const orders = store.get(symbol_binance) || [];
  store.put(symbol_binance, [...orders, price]);
 }
 async clearLongData(symbol_binance: string) {
  store.put(symbol_binance, []);
 }
 async reduceLongData(symbol_binance: string) {
  const orders = store.get(symbol_binance) || [];
  store.put(symbol_binance, orders.length ? orders.slice(1) : []);
 }
 async getOrders(symbol_binance: string) {
  const orders = store.get(symbol_binance) || [];
  return orders;
 }
 async getAverageLong(symbol_binance: string) {
  const orders = store.get(symbol_binance) || [];
  if (orders.length) {
   return orders.reduce((a, b) => a + b, 0) / orders.length;
  } else {
   return Number.POSITIVE_INFINITY;
  }
 }
}
