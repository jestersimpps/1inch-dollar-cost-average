const BigNumber = require("bignumber.js");

export const roundNumber = (value: number, precision: number) =>
 +parseFloat(
  (+value || 0).toFixed(
   precision.toString().length < 2 ? 0 : precision.toString().length - 2
  )
 );

export const roundToDecimals = (value: number, decimalPlaces: number) => {
 if (!Number.isFinite(+value) || !Number.isFinite(decimalPlaces)) {
  throw new Error(
   "Invalid input: value and decimalPlaces must be finite numbers"
  );
 }

 if (decimalPlaces < 0) {
  throw new Error("Invalid input: decimalPlaces must be a non-negative number");
 }

 const scale = Math.pow(10, decimalPlaces);
 return Math.round(value * scale) / scale;
};

export const convertToWei = (value: number, decimals: number) => {
 const amountInMatic = new BigNumber(value);
 const weiPerMatic = new BigNumber(`1e${decimals}`); // 10^18
 const amountInWei = amountInMatic.multipliedBy(weiPerMatic);

 return amountInWei.toFixed(0); // Outputs the amount in wei as a string
};

export const convertFromWei = (value: number, decimals: number) => {
 const amountInWei = new BigNumber(value);
 const weiPerMatic = new BigNumber(`1e${decimals}`); // 10^18
 const amountInMatic = amountInWei.dividedBy(weiPerMatic);

 return amountInMatic.toFixed(0); // Outputs the amount in MATIC as a string
};

export const divideBigNUmbers = (a: number, b: number) => {
 const aBig = new BigNumber(a);
 const bBig = new BigNumber(b);

 return aBig.dividedBy(bBig).toFixed();
};

export const multiplyBigNUmbers = (a: number, b: number) => {
 const aBig = new BigNumber(a);
 const bBig = new BigNumber(b);

 return aBig.multipliedBy(bBig).toFixed();
};

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
