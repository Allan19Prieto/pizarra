export type PriceRecord = {
  date: string;
  product: string;
  unit: string;
  min: number;
  max: number;
  mode: number;
  average: number;
};

export function productKey(record: PriceRecord): string {
  return JSON.stringify([record.product, record.unit]);
}