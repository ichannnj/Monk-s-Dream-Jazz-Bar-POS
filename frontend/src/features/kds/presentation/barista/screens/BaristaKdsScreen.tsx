import React from 'react';
import { UnifiedKdsScreen } from '../../common/UnifiedKdsScreen';

export const BaristaKdsScreen: React.FC = () => {
  return (
    <UnifiedKdsScreen
      stationTarget="bar"
      stationName="Bar Station"
      stationSubtitle="Bar & Cafe items only"
      defaultStaffName="Thelonious (Bartender)"
      defaultStaffRole="Station Bar"
      defaultStaffInitials="TM"
      chatSenderRole="Bar Staff"
      chatDefaultChannel="bar"
    />
  );
};
