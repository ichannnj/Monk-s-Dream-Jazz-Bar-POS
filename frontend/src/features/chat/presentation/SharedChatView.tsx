import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { useSharedChatController } from './hooks/useSharedChatController';
import { ChatTopHeaderBar } from './components/ChatTopHeaderBar';
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
  title = 'Team Chats',
  onBack,
  backLabel = 'Back',
  hideHeader = false,
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
    currentDateTime,
    showScrollBottomPill,
    unseenMessagesCount,
    currentSenderName,
    currentSenderRole,
    userInitials,
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
    <View className={`flex-1 bg-[#FAF5F5] ${isCompact ? 'p-2 sm:p-3' : 'p-2 sm:p-4 lg:p-6'}`}>
      {/* 1. Top Header Bar Card */}
      {!hideHeader && (!isCompact || mobileView === 'list') && (
        <ChatTopHeaderBar
          title={title}
          isMobile={isMobile}
          onBack={onBack}
          backLabel={backLabel}
          currentDateTime={currentDateTime}
          userInitials={userInitials}
          currentSenderName={currentSenderName}
          currentSenderRole={currentSenderRole}
        />
      )}

      {/* 2. Main Two-Column or Single-Column Mobile Layout */}
      <View className="flex-1 flex-row gap-4">
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
          />
        )}

        {/* Right Column: Active Conversation Thread */}
        {showThread && (
          <View className="flex-1 bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-neutral-100 flex-col overflow-hidden relative">
            <ChatThreadHeader
              isCompact={isCompact}
              activeConversation={activeConversation}
              activeStaffRoster={activeStaffRoster}
              onlineUserIds={onlineUserIds}
              currentUserId={currentUser?.id}
              onBackToList={() => setMobileView('list')}
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

            {/* Floating Messenger Jump Pill */}
            {showScrollBottomPill && (
              <Pressable
                onPress={() => scrollToBottom(true)}
                className="absolute bottom-28 self-center flex-row items-center bg-[#581827] px-4 py-2 rounded-full shadow-lg active:opacity-90 z-20"
              >
                <ChevronDown size={18} color="#FFFFFF" />
                <Text className="ml-1.5 text-base font-bold text-white">
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
              onChangeText={setInputText}
              onSend={handleSend}
            />
          </View>
        )}
      </View>
    </View>
  );
};
