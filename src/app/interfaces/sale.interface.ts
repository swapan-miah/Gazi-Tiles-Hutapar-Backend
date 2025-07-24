export interface ISale {
  customer: {
    name: string;
    address: string;
    mobile: string;
  };
  products: {
    product_code: string;
    sell_caton: number;
    sell_feet: number;
  }[];
  date: string;
}
