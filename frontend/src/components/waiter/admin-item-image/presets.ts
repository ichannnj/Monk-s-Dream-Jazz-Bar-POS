export interface ImagePreset {
  label: string;
  category: string;
  url: string;
}

// Curated high-definition food & cocktail photography presets
export const IMAGE_PRESETS: ImagePreset[] = [
  {
    label: 'Espresso / Flat White',
    category: 'Coffee',
    url: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Iced Americano',
    category: 'Coffee',
    url: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Cold Brew / Pour Over',
    category: 'Coffee',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Matcha Latte',
    category: 'Coffee',
    url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Classic Negroni',
    category: 'Cocktail',
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Espresso Martini',
    category: 'Cocktail',
    url: 'https://images.unsplash.com/photo-1545438102-799c3991ffb2?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Pinot Noir / Wine',
    category: 'Wine',
    url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Truffle Carbonara',
    category: 'Kitchen',
    url: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Margherita Pizza',
    category: 'Kitchen',
    url: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Parmesan Truffle Fries',
    category: 'Snacks',
    url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Burrata Crostini',
    category: 'Snacks',
    url: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Butter Croissant',
    category: 'Pastry',
    url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
  },
  {
    label: 'Classic Tiramisu',
    category: 'Dessert',
    url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=600&q=80',
  },
];
