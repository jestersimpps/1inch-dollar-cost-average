
export const roundNumber = (value: number, precision: number) =>
 +parseFloat(
  (+value || 0).toFixed(
   precision.toString().length < 2 ? 0 : precision.toString().length - 2
  )
 );

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
