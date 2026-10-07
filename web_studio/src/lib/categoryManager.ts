// Centralized Dynamic Category Manager for AI News Maker
// Single Source of Truth for Home Feed, RSS Dashboard, and Web Links Dashboard

export interface CategoryItem {
  id: string;
  name: string;
  isActive: boolean;
  order?: number;
}

export const DEFAULT_PRESET_CATEGORIES: CategoryItem[] = [
  { id: 'breaking', name: '⚡ ब्रेकिंग न्यूज़', isActive: true, order: 1 },
  { id: 'politics', name: '🏛️ राजनीति व चुनाव', isActive: true, order: 2 },
  { id: 'state', name: '📍 मध्य प्रदेश', isActive: true, order: 3 },
  { id: 'national', name: '🇮🇳 देश / राष्ट्रीय', isActive: true, order: 4 },
  { id: 'up', name: '📍 उत्तर प्रदेश', isActive: true, order: 5 },
  { id: 'bihar', name: '📍 बिहार', isActive: true, order: 6 },
  { id: 'rajasthan', name: '📍 राजस्थान', isActive: true, order: 7 },
  { id: 'tech', name: '💻 टेक्नोलॉजी', isActive: true, order: 8 },
  { id: 'business', name: '📈 कारोबार व व्यापार', isActive: true, order: 9 },
  { id: 'sports', name: '🏏 खेल', isActive: true, order: 10 },
  { id: 'entertainment', name: '🎬 मनोरंजन', isActive: true, order: 11 },
  { id: 'crime', name: '🚨 क्राइम / अपराध', isActive: true, order: 12 },
  { id: 'accident', name: '🚨 हादसा व दुर्घटना', isActive: true, order: 13 },
  { id: 'agriculture', name: '🌾 खेती-किसानी', isActive: true, order: 14 },
  { id: 'health', name: '🏥 स्वास्थ्य', isActive: true, order: 15 },
  { id: 'special', name: '📑 विशेष रिपोर्ट', isActive: true, order: 16 },
];

const STORAGE_KEY_CATEGORIES_V2 = 'ai_news_unified_categories_v2';
const STORAGE_KEY_LEGACY_LIST = 'ai_news_unified_categories_list';

function slugify(name: string): string {
  const clean = name.trim().toLowerCase().replace(/[^a-zA-Z0-9\u0900-\u097F]/g, '-').replace(/-+/g, '-');
  return clean || `cat-${Date.now()}`;
}

export function getAllCategories(): CategoryItem[] {
  if (typeof window === 'undefined') return DEFAULT_PRESET_CATEGORIES;
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY_CATEGORIES_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Check legacy string list migration
    const legacy = localStorage.getItem(STORAGE_KEY_LEGACY_LIST);
    if (legacy) {
      const parsedLegacy: string[] = JSON.parse(legacy);
      if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
        const migrated: CategoryItem[] = parsedLegacy.map((name, idx) => ({
          id: slugify(name),
          name: name.trim(),
          isActive: true,
          order: idx + 1,
        }));
        saveAllCategories(migrated);
        return migrated;
      }
    }
  } catch (err) {
    console.warn('Failed to load categories from storage', err);
  }
  return DEFAULT_PRESET_CATEGORIES;
}

export function getActiveCategories(): CategoryItem[] {
  return getAllCategories().filter((c) => c.isActive !== false);
}

export function saveAllCategories(categories: CategoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CATEGORIES_V2, JSON.stringify(categories));
    // Keep legacy string list in sync
    const names = categories.filter((c) => c.isActive !== false).map((c) => c.name);
    localStorage.setItem(STORAGE_KEY_LEGACY_LIST, JSON.stringify(names));
    localStorage.setItem('ai_news_rss_categories_list', JSON.stringify(names));
    localStorage.setItem('ai_news_web_categories_list', JSON.stringify(names));

    window.dispatchEvent(new CustomEvent('ai_news_categories_updated', { detail: categories }));
  } catch (err) {
    console.error('Failed to save categories', err);
  }
}

export function addCategory(name: string): CategoryItem {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Category name cannot be empty');

  const categories = getAllCategories();
  const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) {
    if (!existing.isActive) {
      existing.isActive = true;
      saveAllCategories(categories);
    }
    return existing;
  }

  const newCat: CategoryItem = {
    id: slugify(trimmed),
    name: trimmed,
    isActive: true,
    order: categories.length + 1,
  };

  const updated = [...categories, newCat];
  saveAllCategories(updated);
  return newCat;
}

export function updateCategoryName(id: string, newName: string): CategoryItem | null {
  const trimmed = newName.trim();
  if (!trimmed) throw new Error('Category name cannot be empty');

  const categories = getAllCategories();
  const idx = categories.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  categories[idx].name = trimmed;
  saveAllCategories(categories);
  return categories[idx];
}

export function toggleCategoryStatus(id: string): CategoryItem | null {
  const categories = getAllCategories();
  const idx = categories.findIndex((c) => c.id === id);
  if (idx === -1) return null;

  categories[idx].isActive = !categories[idx].isActive;
  saveAllCategories(categories);
  return categories[idx];
}

export function deleteCategoryItem(id: string): boolean {
  const categories = getAllCategories();
  if (categories.length <= 1) return false;

  const updated = categories.filter((c) => c.id !== id);
  saveAllCategories(updated);
  return true;
}
