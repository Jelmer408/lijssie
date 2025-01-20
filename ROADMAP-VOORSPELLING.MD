# Slimme Boodschappen Voorspellingen Feature Roadmap

## Overzicht
Deze feature zal gebruikers helpen bij het voorspellen van welke boodschappen ze nodig hebben op basis van hun historische aankopen en seizoenspatronen, gebruikmakend van Google's Gemini AI voor slimme analyse en voorspellingen. Het doel is om het maken van boodschappenlijstjes efficiënter te maken en productvariaties slim te herkennen.

## Database Schema
1. Nieuwe tabellen in Supabase:
```sql
-- Tabel voor voorspellingspatronen
create table prediction_patterns (
  id uuid default uuid_generate_v4() primary key,
  household_id uuid references households(id) on delete cascade,
  normalized_name text not null,  -- Door AI genormaliseerde productnaam
  original_names jsonb,           -- Array van originele productnamen
  category text not null,
  frequency interval,
  last_purchased timestamp with time zone,
  purchase_count integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabel voor gebruikersvoorkeuren
create table prediction_preferences (
  household_id uuid references households(id) on delete cascade primary key,
  max_suggestions integer default 5,
  enable_notifications boolean default true,
  notification_day text,
  notification_time text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

## Implementatie Stappen

### 1. AI Integratie (`ai-prediction-service.ts`)
- [ ] Integreer Google's Gemini AI:
  ```typescript
  interface AIPredictionService {
    // Normaliseer productnaam met AI
    normalizeProductName(name: string): Promise<string>;
    
    // Analyseer aankooppatronen met AI
    analyzePatterns(householdId: string): Promise<PredictionPattern[]>;
    
    // Genereer voorspellingen met AI
    generatePredictions(householdId: string): Promise<PredictedItem[]>;
    
    // Identificeer gerelateerde producten
    findRelatedProducts(items: string[]): Promise<RelatedProduct[]>;
  }
  ```

### 2. Voorspellingsservice (`prediction-service.ts`)
- [ ] Ontwikkel service met methodes:
  ```typescript
  interface PredictionService {
    // Voorspel items voor een huishouden
    predictItems(householdId: string): Promise<PredictedItem[]>;
    
    // Update patronen na een aankoop
    updatePatterns(householdId: string, items: GroceryItem[]): Promise<void>;
    
    // Beheer voorkeuren
    updatePreferences(householdId: string, preferences: PredictionPreferences): Promise<void>;
  }
  ```

### 3. Types & Interfaces
```typescript
interface PredictedItem {
  normalizedName: string;
  originalName: string;
  category: Category;
  confidence: number;
  lastPurchased: Date | null;
  suggestedQuantity: string;
  reason: PredictionReason;
  relatedProducts?: RelatedProduct[];
}

interface RelatedProduct {
  name: string;
  confidence: number;
  reason: string;
}

enum PredictionReason {
  FREQUENCY = "FREQUENCY",
  RELATED = "RELATED",
  SMART_SUGGESTION = "SMART_SUGGESTION"
}

interface PredictionPreferences {
  maxSuggestions: number;
  enableNotifications: boolean;
  notificationDay?: string;
  notificationTime?: string;
}
```

### 4. UI Componenten

#### 4.1 Voorspellingen Sectie
- [ ] Voeg een nieuwe sectie toe aan de boodschappenlijst:
  - Toon AI-voorspelde items met betrouwbaarheidsscores
  - Mogelijkheid om items direct toe te voegen
  - Toon gerelateerde productsuggesties
  - Uitleg waarom items worden voorspeld (AI-gegenereerd)

#### 4.2 Voorkeuren Modal
- [ ] Ontwikkel een modal voor het beheren van voorspellingsvoorkeuren:
  - Maximaal aantal suggesties
  - Notificatie-instellingen
  - Uitleg over AI-voorspellingen

### 5. AI Prompt Engineering
- [ ] Ontwikkel effectieve prompts voor:
  - Productnaam normalisatie
  - Patroonherkenning
  - Voorspellingen genereren
  - Gerelateerde producten vinden
  - Contextuele suggesties maken

### 6. Notificaties & Herinneringen
- [ ] Implementeer een notificatiesysteem:
  - Push notificaties voor AI-suggesties
  - Instelbare notificatiemomenten
  - AI-gegenereerde herinneringsteksten

### 7. Offline Ondersteuning
- [ ] Zorg voor offline functionaliteit:
  - Cache laatste AI-voorspellingen
  - Lokale opslag van voorkeuren
  - Sync wanneer weer online

### 8. Privacy & Beveiliging
- [ ] Implementeer privacy maatregelen:
  - Transparante uitleg over AI-gebruik
  - Opt-in voor AI-analyse
  - Data minimalisatie
  - Optie om voorspellingsdata te wissen

### 9. Performance Optimalisatie
- [ ] Optimaliseer voor snelheid en efficiëntie:
  - Slimme caching van AI-responses
  - Batch verwerking van AI-analyses
  - Rate limiting voor AI-calls
  - Fallback opties bij AI-service problemen

## Toekomstige Uitbreidingen (v2)
1. Geavanceerde natuurlijke taal interactie
2. Multimodale AI voor productherkenning
3. Persoonlijke AI-shopping assistant
4. Dynamische prijsvoorspellingen
5. Menu suggesties op basis van voorraad
6. Cross-platform AI-integratie

## Technische Overwegingen
1. Efficiënt gebruik van AI-quota
2. Fallback strategieën bij AI-service onderbrekingen
3. Optimale prompt engineering
4. Caching van AI-responses
5. Foutafhandeling bij AI-integratie
6. Schaalbaarheid van AI-requests

## Migratie Plan
1. Gefaseerde uitrol van AI-features
2. Initiële dataverzameling voor AI-training
3. A/B testing van AI-voorspellingen
4. Gebruikers feedback verzamelen
5. Iteratieve verbetering van AI-prompts

## Succes Metrics
1. Nauwkeurigheid van AI-voorspellingen
2. Gebruikersadoptie van AI-suggesties
3. Tijdsbesparing voor gebruikers
4. Gebruikerstevredenheid met AI
5. Vermindering van vergeten items
6. AI-service betrouwbaarheid 