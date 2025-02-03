export type Category =
  | 'Groente & Fruit'
  | 'Vlees & Vis'
  | 'Zuivel & Eieren'
  | 'Brood & Beleg'
  | 'Dranken'
  | 'Snacks & Snoep'
  | 'Pasta & Rijst'
  | 'Conserven'
  | 'Diepvries'
  | 'Huishouden'
  | 'Persoonlijke verzorging'
  | 'Overig';

export function isCategory(value: string): value is Category {
  return [
    'Groente & Fruit',
    'Vlees & Vis',
    'Zuivel & Eieren',
    'Brood & Beleg',
    'Dranken',
    'Snacks & Snoep',
    'Pasta & Rijst',
    'Conserven',
    'Diepvries',
    'Huishouden',
    'Persoonlijke verzorging',
    'Overig'
  ].includes(value);
} 