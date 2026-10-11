import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { Send, AlertTriangle, MessageSquare, Radio } from 'lucide-react-native';

interface Message {
  id: string;
  sender: string;
  role: string;
  content: string;
  timestamp: string;
  isUrgent?: boolean;
  channel: 'all' | 'bar' | 'cafe' | 'food';
}

export const TeamChatScreen: React.FC = () => {
  const { currentUser } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'Bar Station Tablet',
      role: 'station_bar',
      content: '86 on Empress Gin for Blue Note G&T! Please offer Tanqueray.',
      timestamp: '19:42',
      isUrgent: true,
      channel: 'all',
    },
    {
      id: 'msg-2',
      sender: 'Server Chet',
      role: 'waiter',
      content: 'Got it. Customer on Table 3 ordered 2 Old Fashioneds instead.',
      timestamp: '19:44',
      channel: 'bar',
    },
    {
      id: 'msg-3',
      sender: 'Kitchen Food Tablet',
      role: 'station_food',
      content: 'Wagyu Burger for Table 4 is ready on the pass!',
      timestamp: '19:48',
      channel: 'all',
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState<'all' | 'bar' | 'cafe' | 'food'>('all');
  const [isUrgent, setIsUrgent] = useState(false);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      sender: currentUser?.displayName || 'Staff',
      role: currentUser?.role || 'staff',
      content: inputMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isUrgent,
      channel: activeChannel,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage('');
    setIsUrgent(false);
  };

  const filteredMessages = messages.filter(
    (m) => activeChannel === 'all' || m.channel === 'all' || m.channel === activeChannel
  );

  return (
    <View className="flex-1 bg-jazz-950 p-4 flex-row">
      {/* Channels Sidebar */}
      <View className="w-56 border-r border-jazz-850 pr-4">
        <Text className="text-sm font-black text-jazz-gold uppercase tracking-wider mb-3">
          Channels & Broadcast
        </Text>

        <View className="space-y-1.5">
          {(['all', 'bar', 'food', 'cafe'] as const).map((ch) => (
            <TouchableOpacity
              key={ch}
              onPress={() => setActiveChannel(ch)}
              className={`p-2.5 rounded-xl border flex-row items-center space-x-2 ${
                activeChannel === ch
                  ? 'bg-jazz-gold/20 border-jazz-gold'
                  : 'bg-jazz-900 border-jazz-800'
              }`}
            >
              <Radio
                size={14}
                color={activeChannel === ch ? '#f59e0b' : '#9ca3af'}
              />
              <Text
                className={`text-xs font-bold uppercase ${
                  activeChannel === ch ? 'text-jazz-gold' : 'text-gray-300'
                }`}
              >
                #{ch} channel
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="mt-8 p-3 rounded-xl bg-jazz-900/60 border border-jazz-850">
          <Text className="text-[11px] font-bold text-gray-400">
            Emergency 86 Broadcast
          </Text>
          <Text className="text-[10px] text-gray-500 mt-1">
            Urgent messages trigger high-priority alerts across all Waiter and KDS screens.
          </Text>
        </View>
      </View>

      {/* Main Chat Feed */}
      <View className="flex-1 pl-4 flex-col justify-between">
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1 pr-2">
          <View className="space-y-3">
            {filteredMessages.map((msg) => {
              const isMe = msg.sender === currentUser?.displayName;
              return (
                <View
                  key={msg.id}
                  className={`p-3 rounded-2xl max-w-xl ${
                    msg.isUrgent
                      ? 'bg-rose-950/80 border border-rose-600'
                      : isMe
                      ? 'bg-jazz-850 border border-jazz-700 self-end'
                      : 'bg-jazz-900 border border-jazz-800 self-start'
                  }`}
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <View className="flex-row items-center space-x-1.5">
                      {msg.isUrgent && <AlertTriangle size={12} color="#f43f5e" />}
                      <Text
                        className={`text-xs font-black ${
                          msg.isUrgent ? 'text-rose-300' : 'text-jazz-gold'
                        }`}
                      >
                        {msg.sender}
                      </Text>
                      <Text className="text-[10px] text-gray-400">
                        ({msg.role})
                      </Text>
                    </View>
                    <Text className="text-[10px] text-gray-400">
                      {msg.timestamp}
                    </Text>
                  </View>
                  <Text className="text-white text-xs leading-4">
                    {msg.content}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Input Bar */}
        <View className="pt-3 border-t border-jazz-850">
          <View className="flex-row items-center space-x-2">
            <TouchableOpacity
              onPress={() => setIsUrgent(!isUrgent)}
              className={`px-3 py-2.5 rounded-xl border flex-row items-center space-x-1 ${
                isUrgent
                  ? 'bg-rose-600 border-rose-500'
                  : 'bg-jazz-900 border-jazz-800'
              }`}
            >
              <AlertTriangle
                size={14}
                color={isUrgent ? '#ffffff' : '#9ca3af'}
              />
              <Text
                className={`text-xs font-bold ${
                  isUrgent ? 'text-white' : 'text-gray-400'
                }`}
              >
                Urgent
              </Text>
            </TouchableOpacity>

            <TextInput
              placeholder={`Message #${activeChannel}...`}
              placeholderTextColor="#6b7280"
              value={inputMessage}
              onChangeText={setInputMessage}
              className="flex-1 bg-jazz-900 border border-jazz-800 rounded-xl px-3 py-2.5 text-white text-xs"
            />

            <TouchableOpacity
              onPress={handleSendMessage}
              className="p-2.5 bg-jazz-gold rounded-xl items-center justify-center"
            >
              <Send size={16} color="#07090e" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};
