import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface BaristaKdsHeaderProps {
  stationName?: string;
  isOnline?: boolean;
  staffName?: string;
  staffRole?: string;
  staffInitials?: string;
  onStaffPress?: () => void;
}

export const BaristaKdsHeader: React.FC<BaristaKdsHeaderProps> = ({
  stationName = 'Bar Station',
  isOnline = true,
  staffName = 'Thelonious (Bartender)',
  staffRole = 'Bartender',
  staffInitials = 'TM',
  onStaffPress,
}) => {
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const weekday = now.toLocaleDateString('en-US', { weekday: 'short' });
      const month = now.toLocaleDateString('en-US', { month: 'short' });
      const day = now.getDate();
      const time = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      setCurrentTimeStr(`${weekday}, ${month} ${day} · ${time}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.headerContainer}>
      {/* Left: Station Name + Online indicator pill */}
      <View style={styles.leftGroup}>
        <Text style={styles.stationTitle}>{stationName}</Text>
        <View style={styles.onlinePill}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      </View>

      {/* Right: Realtime Clock + Staff Avatar & Details */}
      <View style={styles.rightGroup}>
        <Text style={styles.timeText}>{currentTimeStr || 'Tue, Oct 6 · 1:42 PM'}</Text>

        <Pressable
          onPress={onStaffPress}
          style={({ pressed }) => [styles.staffContainer, pressed && styles.staffPressed]}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{staffInitials}</Text>
          </View>
          <View style={styles.staffDetails}>
            <Text style={styles.staffNameText}>{staffName}</Text>
            <Text style={styles.staffRoleText}>{staffRole}</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 64,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee8e3',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stationTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
    gap: 5,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  onlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  staffContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 6,
  },
  staffPressed: {
    opacity: 0.8,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fce7f3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#831843',
  },
  staffDetails: {
    justifyContent: 'center',
  },
  staffNameText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  staffRoleText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
  },
});
