interface SubcategoryProduct {
  name: string;
  mainCategory: string;
  products: string[];
}

declare const allSubCategoriesProducts: SubcategoryProduct[];

export { allSubCategoriesProducts, SubcategoryProduct }; 