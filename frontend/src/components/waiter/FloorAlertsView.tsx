import React from 'react';
import { SharedAlertsView, SharedAlertsViewProps } from '../shared/SharedAlertsView';

export const FloorAlertsView: React.FC<SharedAlertsViewProps> = (props) => {
  return <SharedAlertsView {...props} />;
};
