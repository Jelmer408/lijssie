import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI with Vite environment variable
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_AI_KEY || '');

interface CategoryResponse {
  mainCategory: string;
  subCategory: string;
}

const CATEGORY_MAP = {
  'Aardappel, groente en fruit': [
    'Aardappelen',
    'Groente',
    'Fruit',
    'Diepvries groente',
    'Diepvries fruit',
    'Gezonde kruiden',
    'Snackgroente en snackfruit',
    'Fruitsalde',
    'Smoothies en sappen'
  ],
  'Salades en maaltijden': [
    'Salades',
    'Kant en klare maaltijden',
    'Quiches',
    'Ovenschotels',
    'Poffertjes en pannenkoeken',
    'Pizza',
    'Verse soepen',
    'Verspakketten',
    'Diepvries kant en klare maaltijden',
    'Snel snacken',
    'Sandwiches',
    'Sushi'
  ],
  'Kaas, vleeswaren en tapas': [
    'Kaas',
    'Vleeswaren',
    'Hummus',
    'Borrelhapjes',
    'Droge worst',
    'Dips en smeersels'
  ],
  'Vlees, kip en vis': [
    'Vlees',
    'Vis',
    'Rundvlees',
    'Varkensvlees',
    'Kip',
    'Kalkoen',
    'Halal',
    'BBQ en Gourmet',
    'Reepjes en blokjes vlees',
    'Worst',
    'Schelpdieren',
    'Kalfsvlees en wild'
  ],
  'Vegetarisch, plantaardig en vegan': [
    'Vleesvervangers',
    'Plantaardige',
    'Visvervangers',
    'Vegetarische en plantaardige vleeswaren',
    'Tofu',
    'Vegetarische spreads',
    'Plantaardige spreads',
    'Vegetarische snack',
    'Plantaardige kaas'
  ],
  'Zuivel, boter en eieren': [
    'Zuivel',
    'Eieren',
    'Kaas',
    'Boter en margarine',
    'Melk',
    'High Protein zuivel',
    'Yoghurt en kwark',
    'Koffiemelk en room',
    'Toetjes',
    'Drinkyohurt',
    'Lactosevrijve zuivel',
    'Zuivel tussendoortjes'
  ],
  'Broden, bakkerij en banket': [
    'Brood',
    'Gebak en taart',
    'Broodvervangers',
    'Crackers en beschuit',
    'Afbakbrood',
    'Koek en cake',
    'Toastcrackers',
    'Koolhydraatarm en glutenvrij'
  ],
  'Ontbijtgranen en beleg': [
    'Ontbijtgranen',
    'Zoet beleg',
    'Broodsalades',
    'Hartig broodbeleg',
    'Vleeswaren beleg',
    'Kaas beleg',
    'Cereals en muesli',
    'Poeders',
    'Halal beleg'
  ],
  'Pasta, rijst en wereldkeuken': [
    'Italiaans en mediteriaans',
    'Oosterse keuken',
    'Maaltijdpakketten en mixen',
    'Mexicaans',
    'Hollandse keuken'
  ],
  'Soepen, sauzen, kruiden en olie': [
    'Soepen',
    'Sauzen',
    'Kruiden',
    'Conserven',
    'Smaakmakers',
    'Garnering'
  ],
  'Sport en dieetvoeding': [
    'Supplementen en vitamines',
    'Sportvoeding',
    'Proteine poeder',
    'Eiwitshakes',
    'Dieetvoeding',
    'Optiek',
    'Zelfzorg'
  ],
  'Diepvries': [
    'IJs',
    'Diepvries pizza',
    'Diepvries snacks',
    'Diepvries aardappel',
    'Diepvries, vis en vlees',
    'Diepvries, gebak en bladerdeeg',
    'Diepvries kant en klare maaltijden',
    'Diepvries glutenvrij',
    'Diepvries babyvoeding'
  ],
  'Drogisterij': [
    'Lichaamsverzorging',
    'Mondverzorging',
    'Pijnstillers',
    'Haarverzorging',
    'Make up',
    'Maandverband en tampons',
    'Intimiteit'
  ],
  'Baby en kind': [
    'Luiers en doekjes',
    'Babyvoeding',
    'Baby en kind verzorging',
    'Zwangerschap',
    'Baby gezondheid'
  ],
  'Huishouden': [
    'Schoonmaakmiddelen',
    'Wasmiddel en wasverzachters',
    'Luchtverfrissers',
    'Vaatwas en afwasmiddelen',
    'Schoonmaak producten',
    'Vuilniszakken en folies',
    'Toiletpapier',
    'Tissues en keukenpapier'
  ],
  'Huisdier': [
    'Honden',
    'Katten',
    'Vissen',
    'Knaagdieren',
    'Vogels'
  ],
  'Koken, tafelen en vrije tijd': [
    'Koken en bakken'
  ]
} as const;

// Define types after the CATEGORY_MAP definition
type MainCategoryType = keyof typeof CATEGORY_MAP;
type SubCategoryType = typeof CATEGORY_MAP[MainCategoryType][number];

export async function categorizeGroceryItem(itemName: string): Promise<CategoryResponse> {
  try {
    const model = genAI.getGenerativeModel({ model: import.meta.env.VITE_GOOGLE_AI_MODEL });

    // First prompt to get main category
    const mainCategoryPrompt = `Given this grocery item: "${itemName}", choose the most appropriate main category from this list:
${Object.keys(CATEGORY_MAP).map(cat => `- ${cat}`).join('\n')}

Only respond with the category name, nothing else.`;

    const mainCategoryResult = await model.generateContent(mainCategoryPrompt);
    const mainCategory = mainCategoryResult.response.text().trim();

    // Type assertion for main category
    const mainCategoryKey = mainCategory as MainCategoryType;

    // Validate main category
    if (!Object.prototype.hasOwnProperty.call(CATEGORY_MAP, mainCategoryKey)) {
      throw new Error(`Invalid main category returned by AI: ${mainCategory}`);
    }

    // Second prompt to get subcategory
    const subCategories = CATEGORY_MAP[mainCategoryKey];
    const subCategoryPrompt = `Given this grocery item: "${itemName}" and its main category "${mainCategory}", 
choose the most appropriate subcategory from the following list. Only respond with the subcategory name, nothing else.

${subCategories.join('\n')}`;

    const subCategoryResult = await model.generateContent(subCategoryPrompt);
    const subCategory = subCategoryResult.response.text().trim();

    // Validate subcategory
    const typedSubCategories = CATEGORY_MAP[mainCategoryKey];
    const isValidSubCategory = (typedSubCategories as readonly string[]).includes(subCategory);
    
    if (!isValidSubCategory) {
      console.warn(`Unexpected subcategory returned by AI: ${subCategory}`);
      return {
        mainCategory: 'Overig',
        subCategory: 'Overig'
      };
    }

    // Return the categorization result
    return {
      mainCategory: mainCategoryKey,
      subCategory: subCategory as SubCategoryType
    };
  } catch (error) {
    console.error('Error categorizing grocery item:', error);
    // Return default category if AI fails
    return {
      mainCategory: 'Overig',
      subCategory: 'Overig'
    };
  }
}

// Export categories for use in other parts of the application
export const CATEGORIES = CATEGORY_MAP;
export type MainCategory = MainCategoryType;
export type SubCategory = SubCategoryType; 