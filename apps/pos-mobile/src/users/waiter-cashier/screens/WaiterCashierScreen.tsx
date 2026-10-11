import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { FloorPlanView } from '../components/FloorPlanView';
import { MenuCatalogue } from '../components/MenuCatalogue';
import { ActiveTabCart } from '../components/ActiveTabCart';
import { useCartStore } from '../../../store/useCartStore';
import { INITIAL_MENU, INITIAL_TABLES, MenuItem, TableItem } from '../../../mockData';
import { Sparkles } from 'lucide-react-native';

export const WaiterCashierScreen: React.FC = () => {
  const {
    items: cartItems,
    selectedTableNumber,
    selectTable,
    addItem,
    updateQuantity,
    clearCart,
    getSubtotal,
    getCorkageTotal,
    getTotal,
  } = useCartStore();

  const [tables, setTables] = useState<TableItem[]>(INITIAL_TABLES);
  const [notification, setNotification] = useState<string | null>(null);

  const handleAddItem = (item: MenuItem) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      stations: item.stations,
      isCorkageItem: item.isCorkage,
    });
  };

  const handleSendOrder = () => {
    if (cartItems.length === 0) return;
    const stations = Array.from(new Set(cartItems.flatMap((i) => i.stations)))
      .map((st) => (st === 'cafe' ? 'Barista' : st === 'food' ? 'Kitchen' : 'Bartender'))
      .join(', ');

    setTables((prev) =>
      prev.map((t) =>
        t.tableNumber === selectedTableNumber
          ? { ...t, status: 'PREPARING', totalCentavos: (t.totalCentavos || 0) + getTotal() }
          : t
      )
    );

    setNotification(`Table ${selectedTableNumber} order dispatched to ${stations}!`);
    clearCart();
    setTimeout(() => setNotification(null), 3500);
  };

  return (
    <View className="flex-1 flex-col bg-jazz-950">
      {notification && (
        <View className="px-4 py-2 bg-emerald-950 border-b border-emerald-600 flex-row items-center space-x-2">
          <Sparkles size={16} color="#34d399" />
          <Text className="text-emerald-200 text-xs font-semibold">{notification}</Text>
        </View>
      )}

      <View className="flex-1 flex-row">
        {/* Left: 2D Floor Plan */}
        <View className="w-64">
          <FloorPlanView
            tables={tables}
            selectedTableNumber={selectedTableNumber}
            onSelectTable={selectTable}
          />
        </View>

        {/* Center: Menu Catalog */}
        <View className="flex-1">
          <MenuCatalogue items={INITIAL_MENU} onAddItem={handleAddItem} />
        </View>

        {/* Right: Active Tab & Cashier Checkout */}
        <View className="w-80">
          <ActiveTabCart
            tableNumber={selectedTableNumber}
            items={cartItems}
            subtotal={getSubtotal()}
            corkageTotal={getCorkageTotal()}
            total={getTotal()}
            onUpdateQty={updateQuantity}
            onClear={clearCart}
            onSendOrder={handleSendOrder}
            onSplitTab={() => alert('Split Tab Modal - Select items or divide evenly by guest count')}
            onPayBill={() => alert('Cashier Payment: Tender Cash / Card / Pop Cash Drawer')}
          />
        </View>
      </View>
    </View>
  );
};
