import React from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { SendHorizontal } from 'lucide-react-native';

export interface ChatComposerBarProps {
  inputRef: React.RefObject<TextInput | null>;
  inputText: string;
  quickPresets: string[];
  conversationTitle: string;
  onChangeText: (text: string) => void;
  onSend: (text?: string) => void;
}

export const ChatComposerBar: React.FC<ChatComposerBarProps> = ({
  inputRef,
  inputText,
  quickPresets,
  conversationTitle,
  onChangeText,
  onSend,
}) => {
  return (
    <View className="flex-col">
      {/* Quick-tap Presets for Fast Mobile & Tablet Operation */}
      <View className="border-t border-neutral-100 px-3 sm:px-5 py-2 sm:py-2.5 bg-neutral-50/70">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row items-center gap-2">
            {quickPresets.map((preset, idx) => (
              <Pressable
                key={idx}
                onPress={() => onSend(preset)}
                className="bg-white border border-neutral-200/80 px-4 py-2.5 rounded-full active:bg-neutral-100 min-h-[48px] justify-center shadow-xs"
              >
                <Text className="text-base font-medium text-neutral-700">{preset}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Message Input Bar */}
      <View className="flex-row items-center px-5 py-3 border-t border-neutral-100 gap-2.5 bg-white">
        <View className="flex-1 min-h-[48px] bg-neutral-100/90 rounded-full px-4 py-2.5 justify-center border border-neutral-200/50">
          <TextInput
            ref={inputRef}
            autoFocus
            blurOnSubmit={false}
            className="text-base text-neutral-900 w-full"
            placeholder={`Message ${conversationTitle}...`}
            placeholderTextColor="#9CA3AF"
            value={inputText}
            onChangeText={onChangeText}
            onSubmitEditing={() => onSend()}
            returnKeyType="send"
            style={
              {
                outlineStyle: 'none',
                outlineWidth: 0,
                outlineColor: 'transparent',
              } as any
            }
          />
        </View>

        <Pressable
          onPress={() => onSend()}
          className="w-12 h-12 rounded-full bg-[#581827] items-center justify-center active:opacity-90 shadow-sm"
          accessibilityLabel="Send message"
        >
          <SendHorizontal size={20} color="#FFFFFF" strokeWidth={2.4} />
        </Pressable>
      </View>
    </View>
  );
};
