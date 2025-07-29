export interface ISaleProduct {
  product_code: string;
  sell_caton: number;
  sell_pcs: number;
  sell_feet: number;
  store_feet: number;
  height: number;
  width: number;
  per_caton_to_pcs: number;
}

export interface ISale {
  invoice_number: number;
  date: string;
  products: ISaleProduct[];
}
