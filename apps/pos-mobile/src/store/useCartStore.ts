import { create } from 'zustand';

export interface CartItem {
  cartItemId: string;
  menuItemId: string;
  name: string;
  price: number; // in centavos
  quantity: number;
  notes?: string;
  stations: ('bar' | 'cafe' | 'food')[];
  isCorkageItem: boolean;
}

interface CartState {
  selectedTableNumber: number | null;
  guestCount: number;
  customerNote: string;
  items: CartItem[];
  selectTable: (tableNumber: number | null) => void;
  addItem: (item: Omit<CartItem, 'cartItemId' | 'quantity'>) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  setNotes: (cartItemId: string, notes: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getCorkageTotal: () => number;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  selectedTableNumber: 1,
  guestCount: 2,
  customerNote: '',
  items: [],

  selectTable: (tableNumber) => set({ selectedTableNumber: tableNumber }),

  addItem: (newItem) => {
    const { items } = get();
    const existingIndex = items.findIndex(
      (i) => i.menuItemId === newItem.menuItemId && i.notes === newItem.notes
    );

    if (existingIndex > -1) {
      const updated = [...items];
      updated[existingIndex].quantity += 1;
      set({ items: updated });
    } else {
      const cartItemId = `${newItem.menuItemId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      set({
        items: [
          ...items,
          {
            ...newItem,
            cartItemId,
            quantity: 1,
          },
        ],
      });
    }
  },

  removeItem: (cartItemId) => {
    set((state) => ({
      items: state.items.filter((i) => i.cartItemId !== cartItemId),
    }));
  },

  updateQuantity: (cartItemId, delta) => {
    set((state) => {
      const updated = state.items
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
      return { items: updated };
    });
  },

  setNotes: (cartItemId, notes) => {
    set((state) => ({
      items: state.items.map((i) => (i.cartItemId === cartItemId ? { ...i, notes } : i)),
    }));
  },

  clearCart: () => set({ items: [], customerNote: '' }),

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  getCorkageTotal: () => {
    const { items } = get();
    // 20% flat corkage rate on items flagged with corkage
    return items
      .filter((i) => i.isCorkageItem)
      .reduce((sum, item) => sum + Math.round(item.price * item.quantity * 0.2), 0);
  },

  getTotal: () => {
    return get().getSubtotal() + get().getCorkageTotal();
  },
}));
