import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
} from 'react-native';
import { MessageSquare, Send, Users, Wine, ChefHat } from 'lucide-react-native';
import { useOrderStore } from '../../store/useOrderStore';
import { toast } from '../../store/useToastStore';

export const FloorChatView: React.FC = () => {
  const { chatMessages, addChatMessage } = useOrderStore();
  const [activeChannel, setActiveChannel] = useState<'all' | 'bar' | 'kitchen'>(
    'all'
  );
  const [inputText, setInputText] = useState('');

  const quickPresets = [
    'Rush order on Table B1 please!',
    'Table C3 asking for extra water carafes.',
    'Running low on clean pint glasses at bar rail.',
    'Allergy alert: No dairy on carbonara.',
    'Ready for buzzout delivery at pass counter.',
  ];

  const filteredMessages = chatMessages.filter(
    (m) => activeChannel === 'all' || m.channel === activeChannel
  );

  const handleSend = (text?: string) => {
    const msg = (text || inputText).trim();
    if (!msg) {
      toast.warning('Please enter a message before sending.', {
        title: 'Empty Message',
      });
      return;
    }

    addChatMessage(activeChannel, msg, 'Jess Santos', 'Waiter');
    const channelName =
      activeChannel === 'all'
        ? '#all-staff'
        : activeChannel === 'bar'
        ? '#bar-station'
        : '#kitchen-station';
    toast.success(`Broadcast sent to ${channelName}`, {
      title: 'Message Dispatched',
      duration: 2500,
    });
    setInputText('');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.badge}>
            <MessageSquare size={18} color="#ffffff" strokeWidth={2.4} />
          </View>
          <View>
            <Text style={styles.title}>Internal Floor & Station Chat</Text>
            <Text style={styles.subtitle}>
              Instant communication between Waiters, Baristas, and Kitchen Line
            </Text>
          </View>
        </View>

        {/* Channel Pills */}
        <View style={styles.channelRow}>
          <Pressable
            onPress={() => setActiveChannel('all')}
            style={[
              styles.channelBtn,
              activeChannel === 'all' && styles.channelBtnActive,
            ]}
          >
            <Users
              size={13}
              color={activeChannel === 'all' ? '#ffffff' : '#4b5563'}
            />
            <Text
              style={[
                styles.channelBtnText,
                activeChannel === 'all' && styles.channelBtnTextActive,
              ]}
            >
              #all-staff
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveChannel('bar')}
            style={[
              styles.channelBtn,
              activeChannel === 'bar' && styles.channelBtnActive,
            ]}
          >
            <Wine
              size={13}
              color={activeChannel === 'bar' ? '#ffffff' : '#4b5563'}
            />
            <Text
              style={[
                styles.channelBtnText,
                activeChannel === 'bar' && styles.channelBtnTextActive,
              ]}
            >
              #bar-station
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveChannel('kitchen')}
            style={[
              styles.channelBtn,
              activeChannel === 'kitchen' && styles.channelBtnActive,
            ]}
          >
            <ChefHat
              size={13}
              color={activeChannel === 'kitchen' ? '#ffffff' : '#4b5563'}
            />
            <Text
              style={[
                styles.channelBtnText,
                activeChannel === 'kitchen' && styles.channelBtnTextActive,
              ]}
            >
              #kitchen-line
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Messages Scroll Area */}
      <ScrollView
        style={styles.messagesScroll}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredMessages.map((msg) => {
          const isMe = msg.senderName === 'Jess Santos';

          return (
            <View
              key={msg.id}
              style={[
                styles.bubbleWrapper,
                isMe ? styles.bubbleWrapperMe : styles.bubbleWrapperOther,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  isMe ? styles.bubbleMe : styles.bubbleOther,
                ]}
              >
                <View style={styles.bubbleHeader}>
                  <Text
                    style={[
                      styles.senderName,
                      isMe ? styles.senderNameMe : styles.senderNameOther,
                    ]}
                  >
                    {msg.senderName} ({msg.senderRole})
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      isMe ? styles.messageTimeMe : styles.messageTimeOther,
                    ]}
                  >
                    {msg.timestamp}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.messageText,
                    isMe ? styles.messageTextMe : styles.messageTextOther,
                  ]}
                >
                  {msg.message}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Quick Tap Presets */}
      <View style={styles.presetsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsScroll}
        >
          {quickPresets.map((preset, idx) => (
            <Pressable
              key={idx}
              onPress={() => handleSend(preset)}
              style={styles.presetChip}
            >
              <Text style={styles.presetChipText}>{preset}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.chatInput}
          placeholder={`Message #${activeChannel}...`}
          placeholderTextColor="#9ca3af"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSend()}
        />
        <Pressable
          onPress={() => handleSend()}
          style={styles.sendBtn}
          disabled={!inputText.trim()}
        >
          <Send size={16} color="#ffffff" strokeWidth={2.3} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ffffff',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
    flexWrap: 'wrap',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#431621',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1e',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#6b7280',
    marginTop: 1,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  channelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
  },
  channelBtnActive: {
    backgroundColor: '#431621',
  },
  channelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
  },
  channelBtnTextActive: {
    color: '#ffffff',
  },
  messagesScroll: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 22,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messagesContent: {
    gap: 12,
  },
  bubbleWrapper: {
    flexDirection: 'row',
    width: '100%',
  },
  bubbleWrapperMe: {
    justifyContent: 'flex-end',
  },
  bubbleWrapperOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: '#431621',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#f3f4f6',
    borderBottomLeftRadius: 4,
  },
  bubbleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '800',
  },
  senderNameMe: {
    color: '#fbcfe8',
  },
  senderNameOther: {
    color: '#4b5563',
  },
  messageTime: {
    fontSize: 10,
  },
  messageTimeMe: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  messageTimeOther: {
    color: '#9ca3af',
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 18,
  },
  messageTextMe: {
    color: '#ffffff',
    fontWeight: '500',
  },
  messageTextOther: {
    color: '#1f2937',
    fontWeight: '500',
  },
  presetsRow: {
    marginBottom: 10,
  },
  presetsScroll: {
    gap: 8,
  },
  presetChip: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  presetChipText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 8,
  },
  sendBtn: {
    backgroundColor: '#431621',
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
