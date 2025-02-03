-- Add new supermarkets to the enum
ALTER TYPE supermarket_name ADD VALUE IF NOT EXISTS 'lidl';
ALTER TYPE supermarket_name ADD VALUE IF NOT EXISTS 'aldi';
ALTER TYPE supermarket_name ADD VALUE IF NOT EXISTS 'plus'; 