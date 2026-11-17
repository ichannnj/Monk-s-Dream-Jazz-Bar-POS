import {
  Coffee,
  Wine,
  Beer,
  GlassWater,
  Pizza,
  Cake,
  Ticket,
  UtensilsCrossed,
  Utensils,
} from 'lucide-react-native';
import type { MenuCategoryItem, MenuItem } from '@/types/floor';

export function resolveCategoryIcon(slug?: string, name?: string): any {
  const s = `${slug || ''} ${name || ''}`.toLowerCase();
  if (
    s.includes('coffee') ||
    s.includes('espresso') ||
    s.includes('cafe') ||
    s.includes('latte') ||
    s.includes('cappuccino') ||
    s.includes('tea') ||
    s.includes('brew')
  ) {
    return Coffee;
  }
  if (
    s.includes('beer') ||
    s.includes('ale') ||
    s.includes('lager') ||
    s.includes('cider') ||
    s.includes('draft') ||
    s.includes('stout') ||
    s.includes('ipa')
  ) {
    return Beer;
  }
  if (
    s.includes('water') ||
    s.includes('juice') ||
    s.includes('soda') ||
    s.includes('mocktail') ||
    s.includes('non-alcoholic') ||
    s.includes('beverage')
  ) {
    return GlassWater;
  }
  if (
    s.includes('dessert') ||
    s.includes('cake') ||
    s.includes('pastry') ||
    s.includes('bakery') ||
    s.includes('sweet') ||
    s.includes('pie')
  ) {
    return Cake;
  }
  if (
    s.includes('pizza') ||
    s.includes('pasta') ||
    s.includes('main') ||
    s.includes('entree') ||
    s.includes('noodle') ||
    s.includes('rice')
  ) {
    return Pizza;
  }
  if (
    s.includes('bite') ||
    s.includes('plate') ||
    s.includes('appetizer') ||
    s.includes('snack') ||
    s.includes('tapas') ||
    s.includes('starter')
  ) {
    return UtensilsCrossed;
  }
  if (
    s.includes('cocktail') ||
    s.includes('wine') ||
    /\bbar\b/i.test(s) ||
    s.includes('spirit') ||
    s.includes('liquor') ||
    s.includes('martini') ||
    s.includes('whiskey') ||
    s.includes('bourbon') ||
    s.includes('gin')
  ) {
    return Wine;
  }
  if (
    s.includes('door') ||
    s.includes('ticket') ||
    s.includes('admission') ||
    s.includes('event') ||
    s.includes('cover')
  ) {
    return Ticket;
  }
  return Utensils;
}

export const DEFAULT_CATEGORIES: MenuCategoryItem[] = [
  { id: 'coffee', label: 'Coffee & Espresso', Icon: Coffee, sortOrder: 1 },
  { id: 'cocktails_wine', label: 'Bar & Wine', Icon: Wine, sortOrder: 2 },
  { id: 'mains_pasta', label: 'Pasta & Mains', Icon: Pizza, sortOrder: 3 },
  { id: 'small_plates', label: 'Small Bites', Icon: UtensilsCrossed, sortOrder: 4 },
  { id: 'desserts', label: 'Desserts', Icon: Cake, sortOrder: 5 },
  { id: 'door_charge', label: 'Door Charge', Icon: Ticket, sortOrder: 6 },
];

/**
 * Synthesizes active categories by combining DB records, default fallbacks,
 * and any unmapped categories present in loaded products.
 */
export function buildDynamicCategories(
  dbCategories?: { id: string; name: string; slug: string; sort_order?: number }[],
  products?: MenuItem[]
): MenuCategoryItem[] {
  let finalCats: MenuCategoryItem[] = [];

  if (dbCategories && dbCategories.length > 0) {
    finalCats = dbCategories.map((c) => ({
      id: c.slug,
      label: c.name,
      Icon: resolveCategoryIcon(c.slug, c.name),
      sortOrder: c.sort_order,
    }));
  } else {
    finalCats = [...DEFAULT_CATEGORIES];
  }

  // Gracefully incorporate any categories attached to items not in finalCats
  if (products && products.length > 0) {
    const knownSlugs = new Set(finalCats.map((c) => c.id));
    products.forEach((it) => {
      if (it.category && !knownSlugs.has(it.category)) {
        knownSlugs.add(it.category);
        finalCats.push({
          id: it.category,
          label:
            it.categoryName ||
            it.category.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          Icon: resolveCategoryIcon(it.category, it.categoryName),
        });
      }
    });
  }

  return finalCats;
}
