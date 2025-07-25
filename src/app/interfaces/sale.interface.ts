export interface ISaleProduct {
  product_code: string;
  sell_caton: number;
  sell_feet: number;
}

export interface ISale {
  customer: {
    name: string;
    address: string;
    mobile: string;
  };
  date: string;
  products: ISaleProduct[];
}

// export interface ISale {
//   customer: {
//     name: string;
//     address: string;
//     mobile: string;
//   };
//   products: {
//     product_code: string;
//     sell_caton: number;
//     sell_feet: number;
//   }[];
//   date: string;
// }
