export interface SaleItem {
  id: string;
  productName: string;
  supermarket: string;
  currentPrice: string;
  originalPrice?: string;
  discountPercentage: number;
  saleType?: string;
  validFrom: Date;
  validUntil: Date;
  imageUrl?: string;
  category?: string;
}

export interface SupermarketInfo {
  id: string;
  name: string;
  logo: string;
  color: string;
}

export const supermarkets: Record<string, SupermarketInfo> = {
  'Albert Heijn': {
    id: 'ah',
    name: 'Albert Heijn',
    logo: '/supermarkets/ah-logo.png',
    color: '#00B0EF',
  },
  'Dirk': {
    id: 'dirk',
    name: 'Dirk',
    logo: '/supermarkets/dirk-logo.png',
    color: '#E60012',
  },
  'Jumbo': {
    id: 'jumbo',
    name: 'Jumbo',
    logo: '/supermarkets/jumbo-logo.png',
    color: '#FDD700',
  },
}; 