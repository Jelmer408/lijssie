export type Category = typeof CATEGORIES[number];

export function isCategory(value: string): value is Category {
  return CATEGORIES.includes(value as Category);
}

export const CATEGORIES = [
  'Aardappel, groente en fruit',
  'Salades en maaltijden',
  'Kaas, vleeswaren en tapas',
  'Vlees, kip en vis',
  'Vegetarisch, plantaardig en vegan',
  'Zuivel, boter en eieren',
  'Broden, bakkerij en banket',
  'Ontbijtgranen en beleg',
  'Snoep, koek en chocolade',
  'Chips, popcorn en noten',
  'Tussendoortjes',
  'Frisdrank en sappen',
  'Koffie en thee',
  'Bier, wijn en aperitieven',
  'Pasta, rijst en wereldkeuken',
  'Soepen, sauzen, kruiden en olie',
  'Sport en dieetvoeding',
  'Diepvries',
  'Drogisterij',
  'Baby en kind',
  'Huishouden',
  'Huisdier',
  'Koken, tafelen en vrije tijd',
  'Overig'
] as const;

export const CATEGORY_LABELS: Record<Category, string> = {
  'Aardappel, groente en fruit': '🥬 Groente en Fruit',
  'Salades en maaltijden': '🥗 Maaltijden',
  'Kaas, vleeswaren en tapas': '🧀 Kaas en Vleeswaren',
  'Vlees, kip en vis': '🥩 Vlees en Vis',
  'Vegetarisch, plantaardig en vegan': '🌱 Vegetarisch',
  'Zuivel, boter en eieren': '🥛 Zuivel',
  'Broden, bakkerij en banket': '🥖 Brood en Bakkerij',
  'Ontbijtgranen en beleg': '🥜 Ontbijt',
  'Snoep, koek en chocolade': '🍫 Snoep en Koek',
  'Chips, popcorn en noten': '🥨 Snacks',
  'Tussendoortjes': '🍪 Tussendoortjes',
  'Frisdrank en sappen': '🥤 Dranken',
  'Koffie en thee': '☕️ Warme Dranken',
  'Bier, wijn en aperitieven': '🍷 Alcohol',
  'Pasta, rijst en wereldkeuken': '🍝 Wereldkeuken',
  'Soepen, sauzen, kruiden en olie': '🥣 Soepen en Sauzen',
  'Sport en dieetvoeding': '💪 Sport en Dieet',
  'Diepvries': '❄️ Diepvries',
  'Drogisterij': '🧴 Drogisterij',
  'Baby en kind': '👶 Baby',
  'Huishouden': '🧹 Huishouden',
  'Huisdier': '🐾 Huisdier',
  'Koken, tafelen en vrije tijd': '🍳 Koken',
  'Overig': '📦 Overig'
};

export const categoryEmojis: Record<Category, string> = {
  'Aardappel, groente en fruit': '🥬',
  'Salades en maaltijden': '🥗',
  'Kaas, vleeswaren en tapas': '🧀',
  'Vlees, kip en vis': '🥩',
  'Vegetarisch, plantaardig en vegan': '🌱',
  'Zuivel, boter en eieren': '🥛',
  'Broden, bakkerij en banket': '🥖',
  'Ontbijtgranen en beleg': '🥜',
  'Snoep, koek en chocolade': '🍫',
  'Chips, popcorn en noten': '🥨',
  'Tussendoortjes': '🍪',
  'Frisdrank en sappen': '🥤',
  'Koffie en thee': '☕️',
  'Bier, wijn en aperitieven': '🍷',
  'Pasta, rijst en wereldkeuken': '🍝',
  'Soepen, sauzen, kruiden en olie': '🥣',
  'Sport en dieetvoeding': '💪',
  'Diepvries': '❄️',
  'Drogisterij': '🧴',
  'Baby en kind': '👶',
  'Huishouden': '🧹',
  'Huisdier': '🐾',
  'Koken, tafelen en vrije tijd': '🍳',
  'Overig': '📦'
}; 