import React from 'react';
import { UnifiedKdsScreen } from '../../common/UnifiedKdsScreen';

export const KitchenKdsScreen: React.FC = () => {
  return (
    <UnifiedKdsScreen
      stationTarget="kitchen"
      stationName="Kitchen Station"
      stationSubtitle="Mains, Pasta & Small Plates Line"
      defaultStaffName="Chet (Head Chef)"
      defaultStaffRole="Station Food"
      defaultStaffInitials="CB"
      chatSenderRole="Kitchen Line"
      chatDefaultChannel="kitchen"
    />
  );
};
