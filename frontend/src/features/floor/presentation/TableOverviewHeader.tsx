import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { PlusCircle, ShoppingBag, Bike, Utensils } from 'lucide-react-native';

interface TableOverviewHeaderProps {
  staffName?: string;
  staffRole?: string;
  staffInitials?: string;
  onOpenTableTab?: () => void;
  onNewTakeout?: () => void;
  onInputOnlineOrder?: () => void;
}

export const TableOverviewHeader: React.FC<TableOverviewHeaderProps> = ({
  staffName = 'Floor Staff',
  staffRole = 'Staff',
  staffInitials = 'MD',
  onOpenTableTab,
  onNewTakeout,
  onInputOnlineOrder,
}) => {
  return (
    <View style={styles.headerContainer}>
      {/* Title & Channel Quick Action Buttons */}
      <View style={styles.leftCol}>
        <Text style={styles.titleText}>Monk’s Dream Table Overview</Text>

        <View style={styles.quickActionsGroup}>
          {/* 1. Open Table Tab */}
          {onOpenTableTab ? (
            <Pressable
              onPress={onOpenTableTab}
              style={({ pressed }) => [
                styles.quickActionBtn,
                styles.btnWine,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open Table Tab"
            >
              <PlusCircle size={16} color="#ffffff" strokeWidth={2.3} />
              <Text style={styles.btnTextWhite}>Open Table Tab</Text>
            </Pressable>
          ) : null}

          {/* 2. New Takeout */}
          {onNewTakeout ? (
            <Pressable
              onPress={onNewTakeout}
              style={({ pressed }) => [
                styles.quickActionBtn,
                styles.btnEmerald,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="New Walk-In Takeout"
            >
              <ShoppingBag size={16} color="#ffffff" strokeWidth={2.3} />
              <Text style={styles.btnTextWhite}>New Takeout</Text>
            </Pressable>
          ) : null}

          {/* 3. Input Online Order (GrabFood / Foodpanda) */}
          {onInputOnlineOrder ? (
            <Pressable
              onPress={onInputOnlineOrder}
              style={({ pressed }) => [
                styles.quickActionBtn,
                styles.btnAmber,
                pressed && styles.btnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Input Online Delivery Order"
            >
              <Bike size={16} color="#ffffff" strokeWidth={2.3} />
              <Text style={styles.btnTextWhite}>Input Online Order</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Right Staff Profile & Timestamp */}
      <View style={styles.profileSection}>
        <Text style={styles.timestampText}>Tue, Oct 6 · 1:42 PM</Text>

        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{staffInitials}</Text>
        </View>

        <View style={styles.staffDetails}>
          <Text style={styles.staffNameText}>{staffName}</Text>
          <Text style={styles.staffRoleText}>{staffRole}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#2b0f16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 14,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 18,
  },
  titleText: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1a1a1e',
    letterSpacing: -0.2,
  },
  quickActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  btnWine: {
    backgroundColor: '#641b2a',
  },
  btnEmerald: {
    backgroundColor: '#15803d',
  },
  btnAmber: {
    backgroundColor: '#d97706',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnTextWhite: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timestampText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginRight: 4,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fceeed',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fad4db',
  },
  avatarText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#832238',
  },
  staffDetails: {
    justifyContent: 'center',
  },
  staffNameText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#1a1a1e',
    lineHeight: 17,
  },
  staffRoleText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    lineHeight: 14,
  },
});
