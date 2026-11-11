import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useSharedChatController } from './hooks/useSharedChatController';
import { ChatConversationSidebar } from './components/ChatConversationSidebar';
import { ChatThreadHeader } from './components/ChatThreadHeader';
import { ChatMessageFeed } from './components/ChatMessageFeed';
import { ChatComposerBar } from './components/ChatComposerBar';

export interface SharedChatViewProps {
  senderName?: string;
  senderRole?: string;
  defaultChannel?: string;
  title?: string;
  onBack?: () => void;
  backLabel?: string;
  hideHeader?: boolean;
  compact?: boolean;
}

export const SharedChatView: React.FC<SharedChatViewProps> = ({
  senderName: propSenderName,
  senderRole: propSenderRole,
  defaultChannel,
  onBack,
  backLabel = 'Back',
  compact = false,
}) => {
  const {
    currentUser,
    isMobile,
    isCompact,
    mobileView,
    setMobileView,
    inputText,
    setInputText,
    showScrollBottomPill,
    unseenMessagesCount,
    currentSenderName,
    channels,
    directMessages,
    availableColleagues,
    activeConversation,
    currentMessages,
    quickPresets,
    onlineUserIds,
    activeStaffRoster,
    scrollViewRef,
    inputRef,
    scrollToBottom,
    handleScroll,
    handleSend,
    handleStartDmWithColleague,
    handleSelectConversation,
    unpinAnnouncement,
  } = useSharedChatController({
    senderName: propSenderName,
    senderRole: propSenderRole,
    defaultChannel,
    compact,
  });

  const showList = !isCompact || mobileView === 'list';
  const showThread = !isCompact || mobileView === 'thread';

  return (
    <View className={`flex-1 bg-[#FAF8F5] ${isCompact ? 'p-2 sm:p-3' : 'p-3 sm:p-4 lg:p-6'}`}>
      {/* Main Two-Column or Single-Column Mobile Layout */}
      <View className="flex-1 flex-row gap-3 sm:gap-4">
        {/* Left Column: Messages List (Channels & Direct Messages) */}
        {showList && (
          <ChatConversationSidebar
            isCompact={isCompact}
            channels={channels}
            directMessages={directMessages}
            availableColleagues={availableColleagues}
            activeConversationId={activeConversation.id}
            onlineUserIds={onlineUserIds}
            activeStaffRoster={activeStaffRoster}
            currentUserId={currentUser?.id}
            onSelectConversation={handleSelectConversation}
            onStartDmWithColleague={handleStartDmWithColleague}
            onBack={onBack}
            backLabel={backLabel}
          />
        )}

        {/* Right Column: Active Conversation Thread */}
        {showThread && (
          <View className="flex-1 bg-white rounded-2xl shadow-xs border border-stone-200/80 flex-col overflow-hidden relative">
            <ChatThreadHeader
              isCompact={isCompact}
              activeConversation={activeConversation}
              activeStaffRoster={activeStaffRoster}
              onlineUserIds={onlineUserIds}
              currentUserId={currentUser?.id}
              onBackToList={() => setMobileView('list')}
              onBack={!isCompact ? onBack : undefined}
              backLabel={backLabel}
            />

            <ChatMessageFeed
              scrollViewRef={scrollViewRef}
              activeConversation={activeConversation}
              currentMessages={currentMessages}
              currentSenderName={currentSenderName}
              currentUserId={currentUser?.id}
              onlineUserIds={onlineUserIds}
              activeStaffRoster={activeStaffRoster}
              onScroll={handleScroll}
              onSend={handleSend}
              onUnpinAnnouncement={unpinAnnouncement}
            />

            {/* Floating Jump Pill */}
            {showScrollBottomPill && (
              <Pressable
                onPress={() => scrollToBottom(true)}
                className="absolute bottom-24 self-center flex-row items-center bg-[#810021] px-3.5 py-1.5 rounded-full shadow-md active:opacity-90 z-20"
                accessibilityRole="button"
                accessibilityLabel="Jump to new messages"
              >
                <ChevronDown size={15} color="#FFFFFF" />
                <Text className="ml-1 text-xs font-bold text-white tabular-nums">
                  {unseenMessagesCount > 1
                    ? `${unseenMessagesCount} new messages ↓`
                    : 'New message ↓'}
                </Text>
              </Pressable>
            )}

            <ChatComposerBar
              inputRef={inputRef}
              inputText={inputText}
              quickPresets={quickPresets}
              conversationTitle={activeConversation.title}
              isMobile={isMobile}
              onChangeText={setInputText}
              onSend={handleSend}
            />
          </View>
        )}
      </View>
    </View>
  );
};
