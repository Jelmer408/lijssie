interface SynonymGroup {
  terms: string[];
  brands?: string[];
  category?: string;
  subcategory?: string;
}

// Define common Dutch product synonyms with brands
const DUTCH_PRODUCT_SYNONYMS: SynonymGroup[] = [
  {
    terms: ['wc papier', 'toilet papier', 'toiletpapier', 'wc rol', 'wcpapier', 'closetpapier', 'wcrollen', 'toiletrollen'],
    brands: ['page', 'edet', 'lotus', 'neutral'],
    category: 'Huishouden',
    subcategory: 'Toilet & Tissues'
  },
  {
    terms: ['wasmiddel', 'waspoeder', 'wasgel', 'wasbol', 'wasverzachter', 'wasmiddelen', 'wasproduct', 'vloeibaar wasmiddel', 'waspoeder', 'wasbollen', 'wasverzachter'],
    brands: ['ariel', 'persil', 'omo', 'robijn', 'sunil', 'lenor', 'neutral', 'biotex', 'dreft', 'ajax'],
    category: 'Huishouden',
    subcategory: 'Was & Vaatwas'
  },
  {
    terms: ['afwasmiddel', 'vaatwastabletten', 'vaatwas tabletten', 'vaatwasblokjes', 'vaatwasgel', 'vaatwas', 'afwastabletten', 'vaatwasreiniger', 'vaatwascapsules', 'afwasproduct'],
    brands: ['dreft', 'sun', 'finish', 'ajax', 'ecover'],
    category: 'Huishouden',
    subcategory: 'Was & Vaatwas'
  },
  {
    terms: ['zeep', 'handzeep', 'douchegel', 'doucheschuim', 'handgel', 'handsoap', 'handwash', 'doucheproduct', 'showergel', 'bodylotion', 'doucheschuim', 'badschuim'],
    brands: ['dove', 'sanex', 'nivea', 'palmolive', 'dettol', 'rituals', 'axe', 'neutral', 'zwitsal', 'radox'],
    category: 'Verzorging',
    subcategory: 'Lichaamsverzorging'
  },
  {
    terms: ['chips', 'crisps', 'aardappelchips', 'potato chips', 'nachochips', 'tortillachips', 'chipjes', 'snacks', 'zoutjes'],
    brands: ['lays', 'pringles', 'doritos', 'bugles', 'croky', 'smiths', 'tyrells', 'jumbo chips', 'ah chips', 'lidl chips'],
    category: 'Tussendoor',
    subcategory: 'Chips & Noten'
  },
  {
    terms: ['frisdrank', 'cola', 'sinas', 'fanta', 'limonade', 'prik', 'koolzuurhoudende drank', 'energy drink', 'energiedrank', 'icetea', 'ice tea', 'sprite', 'up', 'seven up', '7up'],
    brands: ['coca cola', 'pepsi', 'fanta', 'sprite', 'fernandes', 'red bull', 'monster', 'river', 'lipton', 'fuze tea', '7up', 'seven up', 'mountain dew', 'dr pepper', 'royal club'],
    category: 'Dranken',
    subcategory: 'Frisdrank'
  },
  {
    terms: ['bier', 'pils', 'speciaalbier', 'witbier', 'weizen', 'ipa', 'alcoholvrij bier', '0.0', 'radler', 'biertje'],
    brands: ['heineken', 'grolsch', 'hertog jan', 'amstel', 'bavaria', 'jupiler', 'corona', 'leffe', 'hoegaarden', 'brand', 'alfa', 'warsteiner', 'desperados', 'palm', 'duvel', 'la chouffe'],
    category: 'Bier, wijn en aperitieven',
    subcategory: 'Bier'
  },
  {
    terms: ['groente', 'groenten', 'verse groenten', 'verse groente', 'groentemix', 'groentepakket', 'gesneden groente', 'voorgesneden groente'],
    brands: [],
    category: 'Groente & Fruit',
    subcategory: 'Groente'
  },
  {
    terms: ['aardappel', 'aardappelen', 'pieper', 'piepers', 'aardappeltjes', 'krieltjes', 'frietaardappelen', 'bakaaardappelen', 'kookaardappelen'],
    brands: ['bildtstar', 'doré', 'nicola', 'eigenheimer'],
    category: 'Groente & Fruit',
    subcategory: 'Aardappelen'
  },
  {
    terms: ['brood', 'broodje', 'boterham', 'boterhammen', 'pistolet', 'stokbrood', 'afbakbrood', 'tijgerbrood', 'volkorenbrood', 'witbrood', 'bruinbrood'],
    category: 'Brood & Banket',
    subcategory: 'Brood'
  },
  {
    terms: ['melk', 'halfvolle melk', 'volle melk', 'magere melk', 'karnemelk', 'lactosevrije melk', 'sojamelk', 'amandelmelk', 'havermelk', 'rijstmelk', 'kokosmelk'],
    brands: ['campina', 'arla', 'alpro', 'oatly', 'optimel', 'friesche vlag', 'milsani'],
    category: 'Zuivel & Eieren',
    subcategory: 'Melk'
  },
  {
    terms: ['kaas', 'plakken kaas', 'geraspte kaas', 'jong kaas', 'jong belegen', 'belegen kaas', 'oude kaas', 'geitenkaas', 'boerenkaas'],
    brands: ['old amsterdam', 'beemster', 'milner', 'leerdammer', 'maaslander', 'noord-hollandse', 'vergeer', 'president'],
    category: 'Kaas, vleeswaren en tapas',
    subcategory: 'Kaas'
  },
  {
    terms: ['koffie', 'koffiebonen', 'gemalen koffie', 'koffiepads', 'koffiecups', 'capsules', 'oploskoffie', 'koffiemelk', 'koffiepad'],
    brands: ['douwe egberts', 'nespresso', 'senseo', 'lavazza', 'illy', 'nescafe', 'starbucks', 'peeze', 'jacobs', 'dolce gusto'],
    category: 'Koffie en thee',
    subcategory: 'Koffie'
  },
  {
    terms: ['thee', 'theezakjes', 'groene thee', 'zwarte thee', 'rooibos', 'kruidenthee', 'theebladeren'],
    brands: ['pickwick', 'lipton', 'twinings', 'zonnatura', 'pukka', 'celestial', 'yogi tea', 'teekanne'],
    category: 'Koffie en thee',
    subcategory: 'Thee'
  }
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ') // Replace special chars with spaces
    .replace(/\s+/g, ' '); // Normalize spaces
}

export function expandDutchSearchTerms(searchTerm: string): string[] {
  const normalizedSearch = normalizeText(searchTerm);
  const words = normalizedSearch.split(' ');
  
  // Find all synonym groups that contain the search term
  const matchingGroups = DUTCH_PRODUCT_SYNONYMS.filter(group => {
    // Check terms
    const hasMatchingTerm = group.terms.some(term => {
      const normalizedTerm = normalizeText(term);
      return normalizedTerm.includes(normalizedSearch) || 
             normalizedSearch.includes(normalizedTerm) ||
             words.some(word => normalizedTerm.includes(word));
    });

    // Check brands
    const hasMatchingBrand = group.brands?.some(brand => {
      const normalizedBrand = normalizeText(brand);
      return normalizedBrand.includes(normalizedSearch) || 
             normalizedSearch.includes(normalizedBrand) ||
             words.some(word => normalizedBrand.includes(word));
    });

    return hasMatchingTerm || hasMatchingBrand;
  });

  if (matchingGroups.length === 0) {
    return [searchTerm];
  }

  // Get all unique terms from matching groups
  const expandedTerms = new Set<string>();
  expandedTerms.add(searchTerm); // Always include the original search term

  matchingGroups.forEach(group => {
    group.terms.forEach(term => expandedTerms.add(term));
    group.brands?.forEach(brand => expandedTerms.add(brand));
  });

  return Array.from(expandedTerms);
}

export function getSynonymCategories(searchTerm: string): { category?: string; subcategory?: string } {
  const normalizedSearch = normalizeText(searchTerm);
  const words = normalizedSearch.split(' ');
  
  // Find the first matching synonym group
  const matchingGroup = DUTCH_PRODUCT_SYNONYMS.find(group => {
    // Check terms
    const hasMatchingTerm = group.terms.some(term => {
      const normalizedTerm = normalizeText(term);
      return normalizedTerm.includes(normalizedSearch) || 
             normalizedSearch.includes(normalizedTerm) ||
             words.some(word => normalizedTerm.includes(word));
    });

    // Check brands
    const hasMatchingBrand = group.brands?.some(brand => {
      const normalizedBrand = normalizeText(brand);
      return normalizedBrand.includes(normalizedSearch) || 
             normalizedSearch.includes(normalizedBrand) ||
             words.some(word => normalizedBrand.includes(word));
    });

    return hasMatchingTerm || hasMatchingBrand;
  });

  return {
    category: matchingGroup?.category,
    subcategory: matchingGroup?.subcategory
  };
} 