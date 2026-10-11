import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SEED_STAFF_USERS, StaffUser } from '../../mockData';
import { PinPadModal } from '../components/PinPadModal';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Flame,
  ShieldCheck,
  LayoutGrid,
  Coffee,
  UtensilsCrossed,
  Wine,
  UserCheck,
  AlertCircle,
} from 'lucide-react-native';

export const LoginScreen: React.FC = () => {
  const { setUser, setActiveRoleView } = useAuthStore();
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getRoleIcon = (role: StaffUser['role']) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck size={20} color="#a855f7" />;
      case 'waiter_cashier':
        return <LayoutGrid size={20} color="#f59e0b" />;
      case 'barista':
        return <Coffee size={20} color="#60a5fa" />;
      case 'kitchen':
        return <UtensilsCrossed size={20} color="#34d399" />;
      case 'bartender':
        return <Wine size={20} color="#fbbf24" />;
    }
  };

  const getRoleBadge = (role: StaffUser['role']) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin / Manager', bg: 'bg-purple-950/70 border-purple-800 text-purple-400' };
      case 'waiter_cashier':
        return { label: 'Waiter / Cashier', bg: 'bg-amber-950/70 border-amber-800 text-amber-400' };
      case 'barista':
        return { label: 'Barista (Coffee)', bg: 'bg-blue-950/70 border-blue-800 text-blue-400' };
      case 'kitchen':
        return { label: 'Kitchen (Food)', bg: 'bg-emerald-950/70 border-emerald-800 text-emerald-400' };
      case 'bartender':
        return { label: 'Bartender (Liquor)', bg: 'bg-amber-950/70 border-amber-700 text-amber-300' };
    }
  };

  const handleSelectStaff = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setErrorMessage(null);
    setIsPinModalOpen(true);
  };

  const handlePinSubmit = (enteredPin: string) => {
    if (!selectedStaff) return;

    if (enteredPin === selectedStaff.pin) {
      setIsPinModalOpen(false);
      setUser({
        id: selectedStaff.id,
        username: selectedStaff.username,
        displayName: selectedStaff.displayName,
        role: selectedStaff.role,
        isActive: true,
      });
      setActiveRoleView(selectedStaff.role);
    } else {
      setErrorMessage(`Incorrect PIN for ${selectedStaff.displayName}. (Hint: try ${selectedStaff.pin})`);
    }
  };

  return (
    <View className="flex-1 bg-jazz-950 items-center justify-center p-6">
      {/* Brand Header */}
      <View className="items-center mb-8">
        <View className="w-16 h-16 rounded-3xl bg-jazz-gold/15 border border-jazz-gold/40 items-center justify-center mb-3 shadow-lg shadow-jazz-gold/10">
          <Flame size={32} color="#f59e0b" />
        </View>
        <Text className="text-2xl font-black text-white tracking-widest uppercase">
          Monk's Dream Jazz Bar
        </Text>
        <Text className="text-xs text-jazz-gold font-bold tracking-wider mt-0.5">
          Staff Fast Switch & PIN Sign-In
        </Text>
      </View>

      {errorMessage && (
        <View className="mb-4 px-4 py-2.5 rounded-xl bg-rose-950/80 border border-rose-600 flex-row items-center space-x-2">
          <AlertCircle size={16} color="#f43f5e" />
          <Text className="text-rose-200 text-xs font-semibold">{errorMessage}</Text>
        </View>
      )}

      {/* Staff User Grid */}
      <View className="w-full max-w-2xl bg-jazz-900/90 border border-jazz-800 rounded-3xl p-6">
        <Text className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
          Select Your User Profile
        </Text>

        <View className="flex-row flex-wrap -mx-2">
          {SEED_STAFF_USERS.map((staff) => {
            const badge = getRoleBadge(staff.role);
            return (
              <View key={staff.id} className="w-1/2 md:w-1/3 p-2">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleSelectStaff(staff)}
                  className="bg-jazz-950/80 border border-jazz-800 hover:border-jazz-gold p-4 rounded-2xl flex-col items-center justify-between h-36"
                >
                  <View className="w-10 h-10 rounded-xl bg-jazz-900 border border-jazz-800 items-center justify-center mb-2">
                    {getRoleIcon(staff.role)}
                  </View>

                  <Text className="text-white font-extrabold text-xs text-center">
                    {staff.displayName}
                  </Text>

                  <View className={`px-2 py-0.5 rounded-full border ${badge.bg} mt-1`}>
                    <Text className="text-[9px] font-bold text-white">
                      {badge.label}
                    </Text>
                  </View>

                  <Text className="text-[10px] text-gray-500 font-mono mt-1">
                    PIN: {staff.pin}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      {/* Pin Pad Modal */}
      <PinPadModal
        visible={isPinModalOpen}
        userName={selectedStaff?.displayName}
        onSuccess={handlePinSubmit}
        onCancel={() => setIsPinModalOpen(false)}
      />
    </View>
  );
};
