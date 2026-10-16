export interface StaffUser {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'waiter' | 'cashier' | 'barista' | 'kitchen' | 'bartender';
  pin: string;
}

export const SEED_STAFF_USERS: StaffUser[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'admin',
    displayName: 'Miles (Manager)',
    role: 'admin',
    pin: '999999',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    username: 'cashier1',
    displayName: 'Coltrane (Cashier)',
    role: 'cashier',
    pin: '111111',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    username: 'waiter1',
    displayName: 'Ella (Floor Waiter)',
    role: 'waiter',
    pin: '222222',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    username: 'bar1',
    displayName: 'Thelonious (Bartender)',
    role: 'bartender',
    pin: '000001',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    username: 'cafe1',
    displayName: 'Bill (Barista)',
    role: 'barista',
    pin: '000002',
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    username: 'kitchen1',
    displayName: 'Chet (Chef)',
    role: 'kitchen',
    pin: '000003',
  },
];

export type TableArea = 'bar' | 'cafe';
export type TableStatus = 'empty' | 'occupied' | 'preparing' | 'ready' | 'served';
export type ChannelCategory = 'all' | 'cafe' | 'bar' | 'takeout' | 'online';

export interface OrderLineItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  stationTarget: 'bar' | 'kitchen';
  modifiers?: string[];
  notes?: string;
  status: 'pending' | 'preparing' | 'ready' | 'served';
}

export interface CustomerTab {
  id: string;
  tabIndex: number;
  guestName: string;
  status: 'open' | 'billed' | 'closed';
  hasCorkageFee?: boolean;
  corkageAmount?: number;
  discountType?: 'staff' | 'promo' | 'comp';
  discountAmount?: number;
  items: OrderLineItem[];
  totalAmount: number;
  openedAt?: string;
}

export interface TableItem {
  id: string;
  code: string;
  area: TableArea;
  seats: number;
  guests: number;
  status: TableStatus;
  elapsedTime: string;
  assignedStaff?: {
    initials: string;
    name: string;
  };
  totalAmount?: number;
  hasOpenCheck: boolean;
  activeTabs: number[];
  maxTabs: number;
  isMyTable: boolean;
  tabs?: CustomerTab[];
}

// -------------------------------------------------------------
// MENU CATALOG MODELS
// -------------------------------------------------------------
export type MenuCategory =
  | 'coffee'
  | 'cocktails_wine'
  | 'mains_pasta'
  | 'small_plates'
  | 'desserts';

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  stationTarget: 'bar' | 'kitchen';
  description: string;
  allergens: string[]; // Dairy, Gluten, Peanuts, Tree Nuts, Eggs, Soy, etc.
  dietary: string[]; // Vegan, Vegetarian, Gluten-Free
  isAvailable: boolean;
  auto86: boolean;
  outOfStockReason?: string;
  isResoldOutsideFood?: boolean;
  originalCost?: number;
  modifiers: {
    id: string;
    name: string;
    priceDelta: number;
  }[];
}

export const SEED_MENU_ITEMS: MenuItem[] = [
  // Specialty Coffee (Barista)
  {
    id: 'm-flat-white',
    name: 'Flat White',
    category: 'coffee',
    price: 4.5,
    stationTarget: 'bar',
    description: 'Double shot specialty espresso with microfoam steamed milk',
    allergens: ['Dairy'],
    dietary: ['Vegetarian'],
    isAvailable: true,
    auto86: false,
    modifiers: [
      { id: 'mod-oat', name: 'Oat Milk Swap', priceDelta: 0.5 },
      { id: 'mod-almond', name: 'Almond Milk Swap', priceDelta: 0.5 },
      { id: 'mod-extra-shot', name: 'Extra Shot', priceDelta: 1.0 },
      { id: 'mod-decaf', name: 'Decaf Swap', priceDelta: 0.0 },
    ],
  },
  {
    id: 'm-iced-americano',
    name: 'Iced Americano',
    category: 'coffee',
    price: 4.0,
    stationTarget: 'bar',
    description: 'Single origin espresso over iced filtered water',
    allergens: [],
    dietary: ['Vegan', 'Gluten-Free'],
    isAvailable: true,
    auto86: false,
    modifiers: [
      { id: 'mod-extra-shot', name: 'Extra Shot', priceDelta: 1.0 },
      { id: 'mod-vanilla', name: 'Madagascar Vanilla Syrup', priceDelta: 0.75 },
    ],
  },
  {
    id: 'm-cold-brew',
    name: 'Single Origin Cold Brew',
    category: 'coffee',
    price: 5.0,
    stationTarget: 'bar',
    description: '18-hour cold steeped Ethiopian Yirgacheffe notes of jasmine & peach',
    allergens: [],
    dietary: ['Vegan', 'Gluten-Free'],
    isAvailable: true,
    auto86: false,
    modifiers: [
      { id: 'mod-oat-splash', name: 'Splash of Oat Milk', priceDelta: 0.3 },
    ],
  },
  {
    id: 'm-matcha-latte',
    name: 'Ceremonial Matcha Latte',
    category: 'coffee',
    price: 5.5,
    stationTarget: 'bar',
    description: 'Uji stone-ground ceremonial matcha whisked with fresh milk',
    allergens: ['Dairy'],
    dietary: ['Vegetarian'],
    isAvailable: false,
    auto86: true,
    outOfStockReason: 'Low Uji Matcha Powder',
    modifiers: [
      { id: 'mod-oat', name: 'Oat Milk Swap', priceDelta: 0.5 },
    ],
  },

  // Cocktails & Wine (Bar / Bartender)
  {
    id: 'm-classic-negroni',
    name: 'Monk’s Classic Negroni',
    category: 'cocktails_wine',
    price: 14.0,
    stationTarget: 'bar',
    description: 'London dry gin, Campari, Sweet vermouth, flamed orange peel',
    allergens: [],
    dietary: ['Vegan', 'Gluten-Free'],
    isAvailable: true,
    auto86: false,
    modifiers: [
      { id: 'mod-gin-sub', name: 'Monkey 47 Gin Upgrade', priceDelta: 3.5 },
    ],
  },
  {
    id: 'm-espresso-martini',
    name: 'Midnight Espresso Martini',
    category: 'cocktails_wine',
    price: 15.0,
    stationTarget: 'bar',
    description: 'Fresh pulled espresso, vodka, Kahlua, dark chocolate dust',
    allergens: [],
    dietary: ['Vegan', 'Gluten-Free'],
    isAvailable: true,
    auto86: false,
    modifiers: [
      { id: 'mod-grey-goose', name: 'Grey Goose Upgrade', priceDelta: 3.0 },
    ],
  },
  {
    id: 'm-pinot-noir',
    name: 'Willamette Valley Pinot Noir (Glass)',
    category: 'cocktails_wine',
    price: 13.0,
    stationTarget: 'bar',
    description: 'Ripe red cherry, earthy forest floor, silky tannins',
    allergens: [],
    dietary: ['Vegan', 'Gluten-Free'],
    isAvailable: true,
    auto86: false,
    modifiers: [],
  },

  // Pasta & Mains (Kitchen)
  {
    id: 'm-truffle-carbonara',
    name: 'Truffle Carbonara',
    category: 'mains_pasta',
    price: 18.0,
    stationTarget: 'kitchen',
    description: 'Artisan spaghetti, cured guanciale, farm fresh eggs, Parmigiano Reggiano, truffle oil',
    allergens: ['Dairy', 'Gluten', 'Eggs'],
    dietary: [],
    isAvailable: true,
    auto86: false,
    modifiers: [
      { id: 'mod-extra-guanciale', name: 'Extra Guanciale', priceDelta: 3.0 },
      { id: 'mod-gf-penne', name: 'Gluten-Free Penne Swap', priceDelta: 1.5 },
    ],
  },
  {
    id: 'm-wild-mushroom-risotto',
    name: 'Wild Forest Mushroom Risotto',
    category: 'mains_pasta',
    price: 19.5,
    stationTarget: 'kitchen',
    description: 'Carnaroli rice, porcini, chanterelles, white wine, thyme, aged pecorino',
    allergens: ['Dairy'],
    dietary: ['Vegetarian', 'Gluten-Free'],
    isAvailable: true,
    auto86: false,
    modifiers: [
      { id: 'mod-vegan-pecorino', name: 'Vegan Cheese Option', priceDelta: 0.0 },
    ],
  },
  {
    id: 'm-margherita-pizza',
    name: 'Wood-Fired Margherita Pizza',
    category: 'mains_pasta',
    price: 16.0,
    stationTarget: 'kitchen',
    description: 'San Marzano DOP tomatoes, buffalo mozzarella, fresh basil, EVOO',
    allergens: ['Dairy', 'Gluten'],
    dietary: ['Vegetarian'],
    isAvailable: true,
    auto86: false,
    modifiers: [
      { id: 'mod-spicy-honey', name: 'Calabrian Chili Hot Honey', priceDelta: 1.5 },
    ],
  },

  // Small Plates & Bites (Kitchen)
  {
    id: 'm-truffle-fries',
    name: 'Parmesan Truffle Fries',
    category: 'small_plates',
    price: 9.0,
    stationTarget: 'kitchen',
    description: 'Double cooked shoestring fries, white truffle oil, shaved parmesan, garlic aioli',
    allergens: ['Dairy', 'Eggs'],
    dietary: ['Vegetarian'],
    isAvailable: true,
    auto86: false,
    modifiers: [
      { id: 'mod-extra-aioli', name: 'Extra Truffle Aioli', priceDelta: 1.0 },
    ],
  },
  {
    id: 'm-burrata-crostini',
    name: 'Artisan Burrata & Fig Crostini',
    category: 'small_plates',
    price: 12.5,
    stationTarget: 'kitchen',
    description: 'Creamy burrata, mission figs, aged balsamic glaze, toasted sourdough',
    allergens: ['Dairy', 'Gluten'],
    dietary: ['Vegetarian'],
    isAvailable: true,
    auto86: false,
    modifiers: [],
  },
  {
    id: 'm-resold-croissant',
    name: 'Bakery Almond Croissant (Pre-made)',
    category: 'small_plates',
    price: 4.8, // 4.00 original cost * 1.20 fixed markup
    stationTarget: 'kitchen',
    description: 'Flaky French butter croissant filled with almond frangipane (resold +20% locked)',
    allergens: ['Dairy', 'Gluten', 'Tree Nuts', 'Eggs'],
    dietary: ['Vegetarian'],
    isAvailable: true,
    auto86: false,
    isResoldOutsideFood: true,
    originalCost: 4.0,
    modifiers: [],
  },

  // Desserts (Kitchen)
  {
    id: 'm-classic-tiramisu',
    name: 'Monk’s Classic Tiramisu',
    category: 'desserts',
    price: 9.0,
    stationTarget: 'kitchen',
    description: 'Savoiardi soaked in espresso & dark rum, mascarpone cream, Valrhona cocoa',
    allergens: ['Dairy', 'Gluten', 'Eggs'],
    dietary: ['Vegetarian'],
    isAvailable: true,
    auto86: false,
    modifiers: [],
  },
];

// -------------------------------------------------------------
// SEED DINE-IN TABLES
// -------------------------------------------------------------
export const SEED_TABLES: TableItem[] = [
  {
    id: 'tbl-b1',
    code: 'B1',
    area: 'bar',
    seats: 6,
    guests: 2,
    status: 'occupied',
    elapsedTime: '3m',
    assignedStaff: { initials: 'JS', name: 'Jess Santos' },
    hasOpenCheck: true,
    activeTabs: [1, 2],
    maxTabs: 6,
    isMyTable: true,
    totalAmount: 46.0,
    tabs: [
      {
        id: 'tab-b1-1',
        tabIndex: 1,
        guestName: 'Miles',
        status: 'open',
        totalAmount: 32.0,
        items: [
          {
            id: 'item-1',
            productId: 'm-classic-negroni',
            productName: 'Monk’s Classic Negroni',
            unitPrice: 14.0,
            quantity: 1,
            stationTarget: 'bar',
            status: 'served',
          },
          {
            id: 'item-2',
            productId: 'm-truffle-carbonara',
            productName: 'Truffle Carbonara',
            unitPrice: 18.0,
            quantity: 1,
            stationTarget: 'kitchen',
            status: 'preparing',
            notes: 'Extra cracked black pepper',
          },
        ],
      },
      {
        id: 'tab-b1-2',
        tabIndex: 2,
        guestName: 'Coltrane',
        status: 'open',
        totalAmount: 14.0,
        items: [
          {
            id: 'item-3',
            productId: 'm-flat-white',
            productName: 'Flat White',
            unitPrice: 5.0,
            quantity: 1,
            stationTarget: 'bar',
            modifiers: ['Oat Milk Swap'],
            status: 'served',
          },
          {
            id: 'item-4',
            productId: 'm-classic-tiramisu',
            productName: 'Monk’s Classic Tiramisu',
            unitPrice: 9.0,
            quantity: 1,
            stationTarget: 'kitchen',
            status: 'ready',
          },
        ],
      },
    ],
  },
  {
    id: 'tbl-b2',
    code: 'B2',
    area: 'bar',
    seats: 4,
    guests: 1,
    status: 'ready',
    elapsedTime: '50m',
    assignedStaff: { initials: 'JS', name: 'Jess Santos' },
    totalAmount: 23.5,
    hasOpenCheck: true,
    activeTabs: [1],
    maxTabs: 4,
    isMyTable: true,
    tabs: [
      {
        id: 'tab-b2-1',
        tabIndex: 1,
        guestName: 'Thelonious',
        status: 'open',
        totalAmount: 23.5,
        items: [
          {
            id: 'item-5',
            productId: 'm-pinot-noir',
            productName: 'Willamette Valley Pinot Noir (Glass)',
            unitPrice: 13.0,
            quantity: 1,
            stationTarget: 'bar',
            status: 'served',
          },
          {
            id: 'item-6',
            productId: 'm-truffle-fries',
            productName: 'Parmesan Truffle Fries',
            unitPrice: 9.0,
            quantity: 1,
            stationTarget: 'kitchen',
            status: 'ready',
          },
        ],
      },
    ],
  },
  {
    id: 'tbl-b3',
    code: 'B3',
    area: 'bar',
    seats: 6,
    guests: 2,
    status: 'occupied',
    elapsedTime: '25m',
    assignedStaff: { initials: 'JS', name: 'Jess Santos' },
    totalAmount: 51.5,
    hasOpenCheck: true,
    activeTabs: [1, 2],
    maxTabs: 6,
    isMyTable: true,
    tabs: [
      {
        id: 'tab-b3-1',
        tabIndex: 1,
        guestName: 'Billie',
        status: 'open',
        totalAmount: 32.5,
        items: [
          {
            id: 'item-7',
            productId: 'm-espresso-martini',
            productName: 'Midnight Espresso Martini',
            unitPrice: 15.0,
            quantity: 1,
            stationTarget: 'bar',
            status: 'served',
          },
          {
            id: 'item-8',
            productId: 'm-margherita-pizza',
            productName: 'Wood-Fired Margherita Pizza',
            unitPrice: 17.5,
            quantity: 1,
            stationTarget: 'kitchen',
            modifiers: ['Calabrian Chili Hot Honey'],
            status: 'preparing',
          },
        ],
      },
      {
        id: 'tab-b3-2',
        tabIndex: 2,
        guestName: 'Evans',
        status: 'open',
        totalAmount: 19.0,
        items: [
          {
            id: 'item-9',
            productId: 'm-classic-negroni',
            productName: 'Monk’s Classic Negroni',
            unitPrice: 14.0,
            quantity: 1,
            stationTarget: 'bar',
            status: 'served',
          },
          {
            id: 'item-10',
            productId: 'm-cold-brew',
            productName: 'Single Origin Cold Brew',
            unitPrice: 5.0,
            quantity: 1,
            stationTarget: 'bar',
            status: 'served',
          },
        ],
      },
    ],
  },
  {
    id: 'tbl-b4',
    code: 'B4',
    area: 'bar',
    seats: 6,
    guests: 4,
    status: 'preparing',
    elapsedTime: '24m',
    assignedStaff: { initials: 'MK', name: 'Miles (Manager)' },
    totalAmount: 78.5,
    hasOpenCheck: true,
    activeTabs: [1, 2, 3, 4],
    maxTabs: 6,
    isMyTable: false,
    tabs: [
      {
        id: 'tab-b4-1',
        tabIndex: 1,
        guestName: 'Dizzy',
        status: 'open',
        totalAmount: 19.5,
        items: [
          {
            id: 'item-11',
            productId: 'm-wild-mushroom-risotto',
            productName: 'Wild Forest Mushroom Risotto',
            unitPrice: 19.5,
            quantity: 1,
            stationTarget: 'kitchen',
            status: 'preparing',
          },
        ],
      },
      {
        id: 'tab-b4-2',
        tabIndex: 2,
        guestName: 'Max',
        status: 'open',
        totalAmount: 18.0,
        items: [
          {
            id: 'item-12',
            productId: 'm-truffle-carbonara',
            productName: 'Truffle Carbonara',
            unitPrice: 18.0,
            quantity: 1,
            stationTarget: 'kitchen',
            status: 'preparing',
          },
        ],
      },
      {
        id: 'tab-b4-3',
        tabIndex: 3,
        guestName: 'Mingus',
        status: 'open',
        totalAmount: 19.0,
        items: [
          {
            id: 'item-13',
            productId: 'm-pinot-noir',
            productName: 'Willamette Valley Pinot Noir (Glass)',
            unitPrice: 13.0,
            quantity: 1,
            stationTarget: 'bar',
            status: 'served',
          },
          {
            id: 'item-14',
            productId: 'm-iced-americano',
            productName: 'Iced Americano',
            unitPrice: 6.0,
            quantity: 1,
            stationTarget: 'bar',
            modifiers: ['Extra Shot', 'Madagascar Vanilla Syrup'],
            status: 'preparing',
          },
        ],
      },
      {
        id: 'tab-b4-4',
        tabIndex: 4,
        guestName: 'Clifford',
        status: 'open',
        totalAmount: 22.0,
        items: [
          {
            id: 'item-14b',
            productId: 'm-classic-negroni',
            productName: 'Monk’s Classic Negroni',
            unitPrice: 14.0,
            quantity: 1,
            stationTarget: 'bar',
            status: 'served',
          },
          {
            id: 'item-14c',
            productId: 'm-truffle-fries',
            productName: 'Parmesan Truffle Fries',
            unitPrice: 8.0,
            quantity: 1,
            stationTarget: 'kitchen',
            status: 'preparing',
          },
        ],
      },
    ],
  },
  {
    id: 'tbl-b5',
    code: 'B5',
    area: 'bar',
    seats: 6,
    guests: 3,
    status: 'served',
    elapsedTime: '42m',
    assignedStaff: { initials: 'JS', name: 'Jess Santos' },
    totalAmount: 49.5,
    hasOpenCheck: true,
    activeTabs: [1, 2],
    maxTabs: 6,
    isMyTable: true,
    tabs: [
      {
        id: 'tab-b5-1',
        tabIndex: 1,
        guestName: 'Herbie',
        status: 'open',
        totalAmount: 34.0,
        items: [
          {
            id: 'item-15',
            productId: 'm-espresso-martini',
            productName: 'Midnight Espresso Martini',
            unitPrice: 18.0,
            quantity: 1,
            stationTarget: 'bar',
            modifiers: ['Grey Goose Upgrade'],
            status: 'served',
          },
          {
            id: 'item-16',
            productId: 'm-margherita-pizza',
            productName: 'Wood-Fired Margherita Pizza',
            unitPrice: 16.0,
            quantity: 1,
            stationTarget: 'kitchen',
            status: 'served',
          },
        ],
      },
      {
        id: 'tab-b5-2',
        tabIndex: 2,
        guestName: 'Wayne',
        status: 'open',
        totalAmount: 15.5,
        items: [
          {
            id: 'item-17',
            productId: 'm-classic-tiramisu',
            productName: 'Monk’s Classic Tiramisu',
            unitPrice: 9.0,
            quantity: 1,
            stationTarget: 'kitchen',
            status: 'served',
          },
          {
            id: 'item-18',
            productId: 'm-flat-white',
            productName: 'Flat White',
            unitPrice: 5.5,
            quantity: 1,
            stationTarget: 'bar',
            modifiers: ['Extra Shot'],
            status: 'served',
          },
        ],
      },
    ],
  },
  {
    id: 'tbl-b6',
    code: 'B6',
    area: 'bar',
    seats: 4,
    guests: 0,
    status: 'empty',
    elapsedTime: '0m',
    hasOpenCheck: false,
    activeTabs: [],
    maxTabs: 4,
    isMyTable: false,
    tabs: [],
  },

  // Cafe Area tables
  {
    id: 'tbl-c1',
    code: 'C1',
    area: 'cafe',
    seats: 4,
    guests: 2,
    status: 'occupied',
    elapsedTime: '18m',
    assignedStaff: { initials: 'JS', name: 'Jess Santos' },
    totalAmount: 64.0,
    hasOpenCheck: true,
    activeTabs: [1],
    maxTabs: 4,
    isMyTable: true,
    tabs: [
      {
        id: 'tab-c1-1',
        tabIndex: 1,
        guestName: 'Chet Baker',
        status: 'open',
        totalAmount: 64.0,
        items: [
          {
            id: 'item-19',
            productId: 'm-truffle-carbonara',
            productName: 'Truffle Carbonara',
            unitPrice: 18.0,
            quantity: 2,
            stationTarget: 'kitchen',
            status: 'preparing',
          },
          {
            id: 'item-20',
            productId: 'm-classic-negroni',
            productName: 'Monk’s Classic Negroni',
            unitPrice: 14.0,
            quantity: 2,
            stationTarget: 'bar',
            status: 'served',
          },
        ],
      },
    ],
  },
  {
    id: 'tbl-c2',
    code: 'C2',
    area: 'cafe',
    seats: 2,
    guests: 0,
    status: 'empty',
    elapsedTime: '0m',
    hasOpenCheck: false,
    activeTabs: [],
    maxTabs: 2,
    isMyTable: false,
    tabs: [],
  },
  {
    id: 'tbl-c3',
    code: 'C3',
    area: 'cafe',
    seats: 6,
    guests: 4,
    status: 'preparing',
    elapsedTime: '15m',
    assignedStaff: { initials: 'JS', name: 'Jess Santos' },
    totalAmount: 198.0,
    hasOpenCheck: true,
    activeTabs: [1, 2, 3, 4],
    maxTabs: 6,
    isMyTable: true,
    tabs: [
      {
        id: 'tab-c3-1',
        tabIndex: 1,
        guestName: 'Sonny Rollins',
        status: 'open',
        totalAmount: 84.5,
        hasCorkageFee: true,
        corkageAmount: 14.0, // 20% wine bottle corkage
        items: [
          {
            id: 'item-21',
            productId: 'm-truffle-carbonara',
            productName: 'Truffle Carbonara',
            unitPrice: 21.0,
            quantity: 2,
            stationTarget: 'kitchen',
            modifiers: ['Extra Guanciale'],
            status: 'preparing',
          },
          {
            id: 'item-22',
            productId: 'm-wild-mushroom-risotto',
            productName: 'Wild Forest Mushroom Risotto',
            unitPrice: 19.5,
            quantity: 1,
            stationTarget: 'kitchen',
            status: 'preparing',
          },
        ],
      },
      {
        id: 'tab-c3-2',
        tabIndex: 2,
        guestName: 'Dexter Gordon',
        status: 'open',
        totalAmount: 44.0,
        items: [
          {
            id: 'item-23',
            productId: 'm-margherita-pizza',
            productName: 'Wood-Fired Margherita Pizza',
            unitPrice: 16.0,
            quantity: 1,
            stationTarget: 'kitchen',
            status: 'preparing',
          },
          {
            id: 'item-24',
            productId: 'm-classic-negroni',
            productName: 'Monk’s Classic Negroni',
            unitPrice: 14.0,
            quantity: 2,
            stationTarget: 'bar',
            status: 'served',
          },
        ],
      },
      {
        id: 'tab-c3-3',
        tabIndex: 3,
        guestName: 'Bud Powell',
        status: 'open',
        totalAmount: 23.5,
        items: [
          {
            id: 'item-25',
            productId: 'm-flat-white',
            productName: 'Flat White',
            unitPrice: 5.5,
            quantity: 1,
            stationTarget: 'bar',
            modifiers: ['Oat Milk Swap'],
            status: 'served',
          },
          {
            id: 'item-26',
            productId: 'm-truffle-carbonara',
            productName: 'Truffle Carbonara',
            unitPrice: 18.0,
            quantity: 1,
            stationTarget: 'kitchen',
            status: 'preparing',
          },
        ],
      },
      {
        id: 'tab-c3-4',
        tabIndex: 4,
        guestName: 'Thelonious Monk',
        status: 'open',
        totalAmount: 46.0,
        items: [
          {
            id: 'item-27',
            productId: 'm-espresso-martini',
            productName: 'Midnight Espresso Martini',
            unitPrice: 16.0,
            quantity: 2,
            stationTarget: 'bar',
            status: 'preparing',
          },
          {
            id: 'item-28',
            productId: 'm-classic-negroni',
            productName: 'Monk’s Classic Negroni',
            unitPrice: 14.0,
            quantity: 1,
            stationTarget: 'bar',
            status: 'served',
          },
        ],
      },
    ],
  },
];

// -------------------------------------------------------------
// WALK-IN TAKEOUT / TO-GO QUEUE
// -------------------------------------------------------------
export interface TakeoutOrder {
  id: string;
  ticketNumber: string; // e.g. "T-105"
  customerName: string;
  items: OrderLineItem[];
  total: number;
  status: 'preparing' | 'ready' | 'completed';
  elapsedTime: string;
  isPrepaid: boolean;
  notes?: string;
}

export const SEED_TAKEOUT_ORDERS: TakeoutOrder[] = [
  {
    id: 'to-105',
    ticketNumber: 'T-105',
    customerName: 'Sarah Jenkins',
    total: 9.8,
    status: 'ready',
    elapsedTime: '6m',
    isPrepaid: true,
    notes: 'To-Go Cup, less ice',
    items: [
      {
        id: 'to-item-1',
        productId: 'm-flat-white',
        productName: 'Flat White (Iced)',
        unitPrice: 5.0,
        quantity: 1,
        stationTarget: 'bar',
        modifiers: ['Oat Milk Swap'],
        status: 'ready',
      },
      {
        id: 'to-item-2',
        productId: 'm-resold-croissant',
        productName: 'Bakery Almond Croissant (Pre-made)',
        unitPrice: 4.8,
        quantity: 1,
        stationTarget: 'kitchen',
        status: 'ready',
      },
    ],
  },
  {
    id: 'to-106',
    ticketNumber: 'T-106',
    customerName: 'Dave Miller',
    total: 23.0,
    status: 'preparing',
    elapsedTime: '11m',
    isPrepaid: false,
    items: [
      {
        id: 'to-item-3',
        productId: 'm-truffle-carbonara',
        productName: 'Truffle Carbonara',
        unitPrice: 18.0,
        quantity: 1,
        stationTarget: 'kitchen',
        status: 'preparing',
        notes: 'To-Go box, extra parmesan packet',
      },
      {
        id: 'to-item-4',
        productId: 'm-cold-brew',
        productName: 'Single Origin Cold Brew',
        unitPrice: 5.0,
        quantity: 1,
        stationTarget: 'bar',
        status: 'ready',
      },
    ],
  },
];

// -------------------------------------------------------------
// ONLINE DELIVERY ORDERS (GrabFood & Foodpanda)
// -------------------------------------------------------------
export interface OnlineDeliveryOrder {
  id: string;
  platform: 'grabfood' | 'foodpanda';
  platformOrderRef: string; // e.g. "GF-8842" or "FP-3012"
  riderName: string;
  customerName: string;
  items: OrderLineItem[];
  total: number;
  status: 'preparing' | 'ready' | 'completed';
  elapsedTime: string;
  paymentStatus: 'PAID_ONLINE_GRAB' | 'PAID_ONLINE_FOODPANDA';
}

export const SEED_ONLINE_ORDERS: OnlineDeliveryOrder[] = [
  {
    id: 'od-grab-1',
    platform: 'grabfood',
    platformOrderRef: 'GF-8842',
    riderName: 'Mike (GrabBike)',
    customerName: 'Kevin Zhao',
    total: 32.0,
    status: 'ready',
    elapsedTime: '16m',
    paymentStatus: 'PAID_ONLINE_GRAB',
    items: [
      {
        id: 'od-item-1',
        productId: 'm-truffle-carbonara',
        productName: 'Truffle Carbonara',
        unitPrice: 18.0,
        quantity: 1,
        stationTarget: 'kitchen',
        status: 'ready',
      },
      {
        id: 'od-item-2',
        productId: 'm-classic-negroni',
        productName: 'Monk’s Classic Negroni (Bottled)',
        unitPrice: 14.0,
        quantity: 1,
        stationTarget: 'bar',
        status: 'ready',
      },
    ],
  },
  {
    id: 'od-panda-1',
    platform: 'foodpanda',
    platformOrderRef: 'FP-3012',
    riderName: 'Dave (Pink Vespa)',
    customerName: 'Aria Montgomery',
    total: 21.0,
    status: 'preparing',
    elapsedTime: '8m',
    paymentStatus: 'PAID_ONLINE_FOODPANDA',
    items: [
      {
        id: 'od-item-3',
        productId: 'm-margherita-pizza',
        productName: 'Wood-Fired Margherita Pizza',
        unitPrice: 16.0,
        quantity: 1,
        stationTarget: 'kitchen',
        status: 'preparing',
      },
      {
        id: 'od-item-4',
        productId: 'm-cold-brew',
        productName: 'Single Origin Cold Brew',
        unitPrice: 5.0,
        quantity: 1,
        stationTarget: 'bar',
        status: 'ready',
      },
    ],
  },
];

// -------------------------------------------------------------
// CHECKS & SETTLED RECEIPTS HISTORY
// -------------------------------------------------------------
export interface CheckItem {
  id: string;
  checkNumber: string;
  orderType: 'dine_in' | 'takeout' | 'online_delivery';
  tableOrRef: string;
  guestName: string;
  itemsCount: number;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'digital_wallet' | 'platform_prepaid' | 'comp';
  status: 'open' | 'billed' | 'paid' | 'voided';
  timestamp: string;
  cashierName: string;
  itemsSummary: string;
}

export const SEED_CHECKS: CheckItem[] = [
  {
    id: 'chk-1041',
    checkNumber: '#1041',
    orderType: 'dine_in',
    tableOrRef: 'Table 4',
    guestName: 'Bill Evans',
    itemsCount: 3,
    subtotal: 38.0,
    tax: 3.8,
    total: 41.8,
    paymentMethod: 'card',
    status: 'paid',
    timestamp: '20:15',
    cashierName: 'Coltrane (Cashier)',
    itemsSummary: '1x Flat White, 1x Carbonara, 1x Tiramisu',
  },
  {
    id: 'chk-1040',
    checkNumber: '#1040',
    orderType: 'takeout',
    tableOrRef: 'Takeout #T-104',
    guestName: 'Rachel Green',
    itemsCount: 2,
    subtotal: 9.5,
    tax: 0.95,
    total: 10.45,
    paymentMethod: 'cash',
    status: 'paid',
    timestamp: '19:50',
    cashierName: 'Jess Santos',
    itemsSummary: '2x Iced Americano',
  },
  {
    id: 'chk-1039',
    checkNumber: '#1039',
    orderType: 'online_delivery',
    tableOrRef: 'GrabFood #GF-8839',
    guestName: 'Carlos M.',
    itemsCount: 2,
    subtotal: 27.0,
    tax: 2.7,
    total: 29.7,
    paymentMethod: 'platform_prepaid',
    status: 'paid',
    timestamp: '19:30',
    cashierName: 'Coltrane (Cashier)',
    itemsSummary: '1x Margherita Pizza, 1x Truffle Fries',
  },
  {
    id: 'chk-1038',
    checkNumber: '#1038',
    orderType: 'dine_in',
    tableOrRef: 'Bar Seat 2',
    guestName: 'Wayne Shorter',
    itemsCount: 1,
    subtotal: 14.0,
    tax: 1.4,
    total: 15.4,
    paymentMethod: 'digital_wallet',
    status: 'paid',
    timestamp: '19:12',
    cashierName: 'Jess Santos',
    itemsSummary: '1x Monk’s Classic Negroni',
  },
];

// -------------------------------------------------------------
// CASH DRAWER TRANSACTIONS & RECONCILIATION
// -------------------------------------------------------------
export interface DrawerEntry {
  id: string;
  type: 'float' | 'cash_in' | 'cash_out' | 'drop' | 'sale';
  amount: number;
  reason: string;
  performedBy: string;
  timestamp: string;
}

export const SEED_DRAWER_TRANSACTIONS: DrawerEntry[] = [
  {
    id: 'drw-1',
    type: 'float',
    amount: 200.0,
    reason: 'Shift Opening Cash Float',
    performedBy: 'Coltrane (Cashier)',
    timestamp: '08:00',
  },
  {
    id: 'drw-2',
    type: 'sale',
    amount: 10.45,
    reason: 'Takeout #T-104 Cash Payment',
    performedBy: 'Jess Santos',
    timestamp: '19:50',
  },
  {
    id: 'drw-3',
    type: 'cash_out',
    amount: -15.0,
    reason: 'Emergency ice bag purchase for bar',
    performedBy: 'Thelonious (Bartender)',
    timestamp: '18:40',
  },
  {
    id: 'drw-4',
    type: 'cash_in',
    amount: 50.0,
    reason: 'Small denomination change restock ($1 & $5 bills)',
    performedBy: 'Miles (Manager)',
    timestamp: '17:20',
  },
  {
    id: 'drw-5',
    type: 'drop',
    amount: -100.0,
    reason: 'Mid-shift safe cash drop (Excess cash)',
    performedBy: 'Miles (Manager)',
    timestamp: '16:00',
  },
];

// -------------------------------------------------------------
// FLOOR ALERTS & BUZZOUT NOTIFICATIONS
// -------------------------------------------------------------
export interface FloorAlert {
  id: string;
  title: string;
  description: string;
  type: 'station_ready' | 'auto_86' | 'transfer' | 'system';
  time: string;
  isRead: boolean;
  targetRef?: string;
}

export const SEED_ALERTS: FloorAlert[] = [
  {
    id: 'alt-1',
    title: '🔔 Order #1042 Ready for Table B2',
    description: 'Bar and Kitchen stations have completed prep. Ready for FOH buzzout delivery.',
    type: 'station_ready',
    time: '2 mins ago',
    isRead: false,
    targetRef: 'B2',
  },
  {
    id: 'alt-2',
    title: '🔔 Takeout #T-105 Ready at Counter',
    description: 'Sarah Jenkins (Flat White & Croissant) packed and waiting at pickup pass.',
    type: 'station_ready',
    time: '5 mins ago',
    isRead: false,
    targetRef: 'T-105',
  },
  {
    id: 'alt-3',
    title: '⚠️ Auto-86 Alert: Matcha Latte',
    description: 'Uji Matcha powder depleted below 1 serving recipe threshold. Item greyed out on catalog.',
    type: 'auto_86',
    time: '14 mins ago',
    isRead: true,
  },
  {
    id: 'alt-4',
    title: '🔁 Station Re-route Broadcast',
    description: 'Table 4 Tab "Miles" relocated to Bar Seat 1. KDS destination cards updated.',
    type: 'transfer',
    time: '35 mins ago',
    isRead: true,
    targetRef: 'Bar 1',
  },
];

// -------------------------------------------------------------
// FLOOR & STATION CHAT
// -------------------------------------------------------------
export interface ChatMessage {
  id: string;
  channel: 'all' | 'bar' | 'kitchen';
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: string;
}

export const SEED_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'chat-1',
    channel: 'all',
    senderName: 'Chet (Chef)',
    senderRole: 'Kitchen',
    message: 'Carbonara prep line is flying tonight! 4 mins avg ticket time.',
    timestamp: '20:40',
  },
  {
    id: 'chat-2',
    channel: 'all',
    senderName: 'Jess Santos',
    senderRole: 'Waiter',
    message: 'Table C3 asking for extra bread and water carafes please.',
    timestamp: '20:42',
  },
  {
    id: 'chat-3',
    channel: 'bar',
    senderName: 'Thelonious',
    senderRole: 'Bartender',
    message: 'Running low on coupe cocktail glasses at the main bar rail.',
    timestamp: '20:30',
  },
  {
    id: 'chat-4',
    channel: 'kitchen',
    senderName: 'Ella',
    senderRole: 'Waiter',
    message: 'Heads up: Table B1 has a severe peanut allergy. Safe on carbonara?',
    timestamp: '20:35',
  },
  {
    id: 'chat-5',
    channel: 'kitchen',
    senderName: 'Chet (Chef)',
    senderRole: 'Kitchen',
    message: 'All clear! Zero peanuts in the pasta station.',
    timestamp: '20:36',
  },
];
