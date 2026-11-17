import { describe, it, expect, vi } from 'vitest';

vi.mock('lucide-react-native', () => ({
  Coffee: 'IconCoffee',
  Wine: 'IconWine',
  Beer: 'IconBeer',
  GlassWater: 'IconGlassWater',
  Pizza: 'IconPizza',
  Cake: 'IconCake',
  Ticket: 'IconTicket',
  UtensilsCrossed: 'IconUtensilsCrossed',
  Utensils: 'IconUtensils',
}));

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
import {
  resolveCategoryIcon,
  DEFAULT_CATEGORIES,
  buildDynamicCategories,
} from '../orderCategoryResolution';
import type { MenuItem } from '@/types/floor';

describe('Order Category Resolution & Dynamic Mapping', () => {
  describe('resolveCategoryIcon keyword mapping', () => {
    it('resolves coffee, espresso, and cafe keywords to Coffee icon', () => {
      expect(resolveCategoryIcon('coffee')).toBe(Coffee);
      expect(resolveCategoryIcon('specialty-espresso', 'Single Origin Espresso')).toBe(Coffee);
      expect(resolveCategoryIcon('iced-latte', 'Barista Latte')).toBe(Coffee);
      expect(resolveCategoryIcon('artisan-tea', 'Artisan Green Tea')).toBe(Coffee);
    });

    it('resolves beer, draft, cider, and lager keywords to Beer icon', () => {
      expect(resolveCategoryIcon('craft-beer', 'Craft Beer on Tap')).toBe(Beer);
      expect(resolveCategoryIcon('draft-ale', 'Pale Ale')).toBe(Beer);
      expect(resolveCategoryIcon('apple-cider', 'Crisp Cider')).toBe(Beer);
      expect(resolveCategoryIcon('bottled-lager', 'San Miguel Light')).toBe(Beer);
    });

    it('resolves cocktail, wine, spirit, and liquor keywords to Wine icon', () => {
      expect(resolveCategoryIcon('cocktails', 'Signature Cocktails')).toBe(Wine);
      expect(resolveCategoryIcon('cocktails_wine', 'Bar & Wine')).toBe(Wine);
      expect(resolveCategoryIcon('single-malt', 'Whiskey & Spirits')).toBe(Wine);
      expect(resolveCategoryIcon('gin-tonic', 'Dry Gin')).toBe(Wine);
    });

    it('resolves water, soda, juice, and mocktail keywords to GlassWater icon', () => {
      expect(resolveCategoryIcon('mocktails', 'Zero-Proof Mocktails')).toBe(GlassWater);
      expect(resolveCategoryIcon('sparkling-water', 'San Pellegrino')).toBe(GlassWater);
      expect(resolveCategoryIcon('fresh-juice', 'Orange Juice')).toBe(GlassWater);
      expect(resolveCategoryIcon('non-alcoholic', 'Non-Alcoholic Drinks')).toBe(GlassWater);
    });

    it('resolves pizza, pasta, and mains keywords to Pizza icon', () => {
      expect(resolveCategoryIcon('pizza', 'Artisan Thin-Crust Pizza')).toBe(Pizza);
      expect(resolveCategoryIcon('mains_pasta', 'Pasta & Mains')).toBe(Pizza);
      expect(resolveCategoryIcon('kitchen-entrees', 'Chef Main Courses')).toBe(Pizza);
      expect(resolveCategoryIcon('ramen-noodles', 'Japanese Noodles')).toBe(Pizza);
    });

    it('resolves dessert, cake, pastry, and bakery keywords to Cake icon', () => {
      expect(resolveCategoryIcon('desserts', 'Pastries & Desserts')).toBe(Cake);
      expect(resolveCategoryIcon('cheesecake', 'New York Cheesecake')).toBe(Cake);
      expect(resolveCategoryIcon('bakery-bites', 'Fresh Bakery')).toBe(Cake);
      expect(resolveCategoryIcon('sweet-treats', 'Sweet Crepes')).toBe(Cake);
    });

    it('resolves door, ticket, event, and admission keywords to Ticket icon', () => {
      expect(resolveCategoryIcon('door_charge', 'Door Charge')).toBe(Ticket);
      expect(resolveCategoryIcon('event-admission', 'Live Jazz Pass')).toBe(Ticket);
      expect(resolveCategoryIcon('concert-ticket', 'VIP Concert Ticket')).toBe(Ticket);
    });

    it('resolves small bites, plates, and snacks keywords to UtensilsCrossed icon', () => {
      expect(resolveCategoryIcon('small_plates', 'Small Bites')).toBe(UtensilsCrossed);
      expect(resolveCategoryIcon('bar-bites', 'Finger Food & Bites')).toBe(UtensilsCrossed);
      expect(resolveCategoryIcon('tapas', 'Spanish Tapas Plate')).toBe(UtensilsCrossed);
      expect(resolveCategoryIcon('starters', 'Appetizers & Starters')).toBe(UtensilsCrossed);
    });

    it('falls back gracefully to Utensils icon for arbitrary novel categories', () => {
      expect(resolveCategoryIcon('merchandise', 'Band T-Shirts')).toBe(Utensils);
      expect(resolveCategoryIcon('vinyl-records', 'Jazz Vinyl LPs')).toBe(Utensils);
      expect(resolveCategoryIcon('misc', 'Miscellaneous Item')).toBe(Utensils);
      expect(resolveCategoryIcon(undefined, undefined)).toBe(Utensils);
    });
  });

  describe('DEFAULT_CATEGORIES configuration', () => {
    it('defines standard default categories with unique IDs and icons', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(6);
      const ids = DEFAULT_CATEGORIES.map((c) => c.id);
      expect(ids).toEqual([
        'coffee',
        'cocktails_wine',
        'mains_pasta',
        'small_plates',
        'desserts',
        'door_charge',
      ]);
      DEFAULT_CATEGORIES.forEach((cat) => {
        expect(cat.label).toBeTruthy();
        expect(cat.Icon).toBeDefined();
        expect(cat.sortOrder).toBeGreaterThan(0);
      });
    });
  });

  describe('Category List Synthesis & Product Discovery', () => {
    it('correctly maps database categories with icons and preserves sort order', () => {
      const dbCategories = [
        { id: 'cat-1', name: 'Artisan Beers', slug: 'artisan-beers', sort_order: 1 },
        { id: 'cat-2', name: 'Jazz Cocktails', slug: 'jazz-cocktails', sort_order: 2 },
        { id: 'cat-3', name: 'Dessert Showcase', slug: 'dessert-showcase', sort_order: 3 },
      ];

      const mapped = buildDynamicCategories(dbCategories);

      expect(mapped).toHaveLength(3);
      expect(mapped[0].id).toBe('artisan-beers');
      expect(mapped[0].Icon).toBe(Beer);
      expect(mapped[1].id).toBe('jazz-cocktails');
      expect(mapped[1].Icon).toBe(Wine);
      expect(mapped[2].id).toBe('dessert-showcase');
      expect(mapped[2].Icon).toBe(Cake);
    });

    it('falls back to DEFAULT_CATEGORIES when no DB categories are provided', () => {
      const mappedEmpty = buildDynamicCategories([]);
      expect(mappedEmpty).toHaveLength(6);
      expect(mappedEmpty[0].id).toBe('coffee');

      const mappedUndefined = buildDynamicCategories(undefined);
      expect(mappedUndefined).toHaveLength(6);
    });

    it('augments DB categories with any orphaned categories discovered in menu items', () => {
      const dbCategories = [
        { id: 'cat-1', name: 'Specialty Coffee', slug: 'coffee', sort_order: 1 },
      ];

      const products: MenuItem[] = [
        {
          id: 'p1',
          name: 'Cappuccino',
          category: 'coffee',
          price: 180,
          stationTarget: 'bar',
          description: '',
          allergens: [],
          dietary: [],
          isAvailable: true,
          auto86: false,
          modifiers: [],
        },
        {
          id: 'p2',
          name: 'Craft IPA',
          category: 'craft-ipa',
          categoryName: 'Craft IPA Beers',
          price: 240,
          stationTarget: 'bar',
          description: '',
          allergens: [],
          dietary: [],
          isAvailable: true,
          auto86: false,
          modifiers: [],
        },
      ];

      const mappedCats = buildDynamicCategories(dbCategories, products);

      expect(mappedCats).toHaveLength(2);
      expect(mappedCats[1].id).toBe('craft-ipa');
      expect(mappedCats[1].label).toBe('Craft IPA Beers');
      expect(mappedCats[1].Icon).toBe(Beer);
    });
  });
});
