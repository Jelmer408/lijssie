export type Category = 
  | 'Zuivel'
  | 'Groenten'
  | 'Fruit'
  | 'Vlees'
  | 'Vis'
  | 'Granen'
  | 'Kruiden'
  | 'Aziatisch'
  | 'Snacks'
  | 'Dranken'
  | 'Beleg'
  | 'Huishoudartikelen'
  | 'Diepvries'
  | 'Conserven'
  | 'Sauzen'
  | 'Pasta'
  | 'Ontbijt'
  | 'Snoep'
  | 'Chips'
  | 'Bakkerij'
  | 'Eieren'
  | 'Overig';

export function isCategory(value: string): value is Category {
  return CATEGORIES.includes(value as Category);
}

export const CATEGORIES: Category[] = [
  'Zuivel',
  'Groenten',
  'Fruit',
  'Vlees',
  'Vis',
  'Granen',
  'Kruiden',
  'Aziatisch',
  'Snacks',
  'Dranken',
  'Beleg',
  'Huishoudartikelen',
  'Diepvries',
  'Conserven',
  'Sauzen',
  'Pasta',
  'Ontbijt',
  'Snoep',
  'Chips',
  'Bakkerij',
  'Eieren',
  'Overig'
];

export const CATEGORY_LABELS: Record<Category, string> = {
  'Zuivel': '🥛 Zuivel',
  'Groenten': '🥬 Groenten',
  'Fruit': '🍎 Fruit',
  'Vlees': '🥩 Vlees',
  'Vis': '🐟 Vis',
  'Granen': '🥖 Granen',
  'Kruiden': '🧂 Kruiden',
  'Aziatisch': '🍚 Aziatisch',
  'Snacks': '🍪 Snacks',
  'Dranken': '🥤 Dranken',
  'Beleg': '🍯 Beleg',
  'Huishoudartikelen': '🧻 Huishoudartikelen',
  'Diepvries': '🧊 Diepvries',
  'Conserven': '🥫 Conserven',
  'Sauzen': '🫙 Sauzen',
  'Pasta': '🍝 Pasta',
  'Ontbijt': '🥣 Ontbijt',
  'Snoep': '🍬 Snoep',
  'Chips': '🥔 Chips',
  'Bakkerij': '🥨 Bakkerij',
  'Eieren': '🥚 Eieren',
  'Overig': '🛒 Overig'
};

export const categoryEmojis: Record<Category, string> = {
  'Zuivel': '🥛',
  'Groenten': '🥬',
  'Fruit': '🍎',
  'Vlees': '🥩',
  'Vis': '🐟',
  'Granen': '🥖',
  'Kruiden': '🧂',
  'Aziatisch': '🍚',
  'Snacks': '🍪',
  'Dranken': '🥤',
  'Beleg': '🍯',
  'Huishoudartikelen': '🧻',
  'Diepvries': '🧊',
  'Conserven': '🥫',
  'Sauzen': '🫙',
  'Pasta': '🍝',
  'Ontbijt': '🥣',
  'Snoep': '🍬',
  'Chips': '🥔',
  'Bakkerij': '🥨',
  'Eieren': '🥚',
  'Overig': '🛒'
}; 