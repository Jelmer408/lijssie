export interface Supermarket {
  id: string;
  name: string;
  logo: string;
  color: string;
}

export const supermarkets: Record<string, Supermarket> = {
  'Albert Heijn': {
    id: 'ah',
    name: 'Albert Heijn',
    logo: '/supermarkets/ah-logo.png',
    color: '#00B0EF',
  },
  'dirk': {
    id: 'dirk',
    name: 'Dirk',
    logo: '/supermarkets/dirk-logo.png',
    color: '#E60012',
  },
  'jumbo': {
    id: 'jumbo',
    name: 'Jumbo',
    logo: '/supermarkets/jumbo-logo.png',
    color: '#FDD700',
  },
  'lidl': {
    id: 'lidl',
    name: 'Lidl',
    logo: '/supermarkets/lidl-logo.png',
    color: '#0050AA',
  },
  'plus': {
    id: 'plus',
    name: 'Plus',
    logo: '/supermarkets/plus-logo.png',
    color: '#EE7203',
  },
  'aldi': {
    id: 'aldi',
    name: 'Aldi',
    logo: '/supermarkets/aldi-logo.png',
    color: '#0C4F9C',
  },
}; 