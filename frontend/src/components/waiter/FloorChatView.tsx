import React from 'react';
import { SharedChatView, SharedChatViewProps } from '../shared/SharedChatView';

export const FloorChatView: React.FC<SharedChatViewProps> = (props) => {
  return <SharedChatView senderRole="Waiter" defaultChannel="all" {...props} />;
};
