import { supabase } from '@/lib/supabase';

interface SupermarketFolder {
  id: string;
  supermarket: string;
  pdfUrl: string;
  weekNumber: number;
  year: number;
  validFrom: Date;
  validUntil: Date;
}

class SupermarketService {
  private async fetchFolderData(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      const html = await response.text();
      
      // Extract PDF URL based on the supermarket
      if (url.includes('ah.nl')) {
        // Albert Heijn specific extraction
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const pdfLink = doc.querySelector('nav a:nth-child(4)');
        return pdfLink?.getAttribute('href') || null;
      } else if (url.includes('dirk.nl')) {
        // Dirk specific extraction
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const pdfLink = doc.querySelector('nav a:nth-child(4)');
        return pdfLink?.getAttribute('href') || null;
      } else if (url.includes('jumbo.com')) {
        // Jumbo specific extraction
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const pdfLink = doc.querySelector('nav a:nth-child(3)');
        return pdfLink?.getAttribute('href') || null;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching folder data:', error);
      return null;
    }
  }

  async getFolders(): Promise<SupermarketFolder[]> {
    try {
      // First try to get cached folders from Supabase
      const { data: cachedFolders, error } = await supabase
        .from('supermarket_folders')
        .select('*')
        .gte('validUntil', new Date().toISOString())
        .order('validFrom', { ascending: true });

      if (error) throw error;

      if (cachedFolders && cachedFolders.length > 0) {
        return cachedFolders;
      }

      // If no valid cached folders, fetch new ones
      const supermarkets = [
        {
          id: 'ah',
          name: 'Albert Heijn',
          url: 'https://www.ah.nl/bonus/folder/bonus-week-3-2025#3'
        },
        {
          id: 'dirk',
          name: 'Dirk',
          url: 'https://www.dirk.nl/folder'
        },
        {
          id: 'jumbo',
          name: 'Jumbo',
          url: 'https://www.jumbo.com/acties/weekaanbiedingen'
        }
      ];

      const folders = await Promise.all(
        supermarkets.map(async (supermarket) => {
          const pdfUrl = await this.fetchFolderData(supermarket.url);
          if (!pdfUrl) return null;

          const now = new Date();
          const folder: SupermarketFolder = {
            id: `${supermarket.id}-${now.getFullYear()}-${now.getWeek()}`,
            supermarket: supermarket.name,
            pdfUrl,
            weekNumber: now.getWeek(),
            year: now.getFullYear(),
            validFrom: now,
            validUntil: new Date(now.setDate(now.getDate() + 7))
          };

          // Cache the folder in Supabase
          await supabase.from('supermarket_folders').upsert(folder);

          return folder;
        })
      );

      return folders.filter((folder): folder is SupermarketFolder => folder !== null);
    } catch (error) {
      console.error('Error getting folders:', error);
      return [];
    }
  }
}

// Helper function to get week number
declare global {
  interface Date {
    getWeek(): number;
  }
}

Date.prototype.getWeek = function(): number {
  const date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

export const supermarketService = new SupermarketService(); 