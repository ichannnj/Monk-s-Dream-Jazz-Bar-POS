import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { MenuItem } from '../../../mockData';
import { Search, Plus, Percent } from 'lucide-react-native';

interface MenuCatalogueProps {
  items: MenuItem[];
  onAddItem: (item: MenuItem) => void;
}

export const MenuCatalogue: React.FC<MenuCatalogueProps> = ({
  items,
  onAddItem,
}) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const categories = ['All', 'Cocktails', 'Coffee', 'Food', 'Corkage'];

  const filtered = items.filter((item) => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const formatPHP = (cents: number) => `₱${(cents / 100).toFixed(2)}`;

  return (
    <View className="flex-1 p-3 bg-jazz-950">
      {/* Search & Category Pills */}
      <View className="flex-row items-center gap-2 mb-3">
        <View className="flex-1 flex-row items-center bg-jazz-900 border border-jazz-800 rounded-xl px-2.5 py-1.5">
          <Search size={14} color="#9ca3af" />
          <TextInput
            placeholder="Search drinks, dishes..."
            placeholderTextColor="#6b7280"
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-1.5 text-white text-xs"
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-grow-0">
          <View className="flex-row space-x-1.5">
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl border ${
                  activeCategory === cat
                    ? 'bg-jazz-gold border-jazz-gold'
                    : 'bg-jazz-900 border-jazz-800'
                }`}
              >
                <Text
                  className={`text-[11px] font-bold ${
                    activeCategory === cat ? 'text-jazz-950' : 'text-gray-300'
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Grid of items */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="flex-row flex-wrap -mx-1">
          {filtered.map((item) => (
            <View key={item.id} className="w-1/2 md:w-1/3 p-1">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onAddItem(item)}
                className="bg-jazz-900/90 border border-jazz-800 hover:border-jazz-700 p-2.5 rounded-xl flex-col justify-between h-32"
              >
                <View>
                  <View className="flex-row items-center space-x-1 mb-1">
                    {item.stations.map((st: string) => (
                      <View
                        key={st}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                          st === 'bar'
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-800'
                            : st === 'cafe'
                            ? 'bg-blue-950/80 text-blue-400 border border-blue-800'
                            : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        <Text
                          className={`text-[8px] font-bold ${
                            st === 'bar'
                              ? 'text-amber-400'
                              : st === 'cafe'
                              ? 'text-blue-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {st === 'bar' ? 'Bartender' : st === 'cafe' ? 'Barista' : 'Kitchen'}
                        </Text>
                      </View>
                    ))}
                    {item.isCorkage && (
                      <View className="px-1 py-0.5 rounded bg-purple-950/80 border border-purple-800 flex-row items-center">
                        <Percent size={8} color="#c084fc" />
                        <Text className="text-[8px] font-bold text-purple-300 ml-0.5">
                          20% Flat
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text numberOfLines={1} className="text-white font-bold text-xs">
                    {item.name}
                  </Text>
                  <Text numberOfLines={2} className="text-gray-400 text-[10px] mt-0.5">
                    {item.description}
                  </Text>
                </View>

                <View className="flex-row items-center justify-between pt-1 border-t border-jazz-850">
                  <Text className="text-jazz-gold font-extrabold text-xs">
                    {formatPHP(item.price)}
                  </Text>
                  <View className="w-6 h-6 rounded-lg bg-jazz-800 items-center justify-center">
                    <Plus size={12} color="#f59e0b" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
