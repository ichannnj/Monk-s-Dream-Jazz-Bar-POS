import { SharedChatView, SharedChatViewProps } from './SharedChatView';

export const FloorChatView: React.FC<SharedChatViewProps> = (props) => {
  return <SharedChatView senderRole="Waiter" defaultChannel="all" {...props} />;
};
