import { Provider } from '@nestjs/common';
import { HybridLogicalClock } from '@monks/shared';
import { HLC_INSTANCE, HUB_ID } from './constants.js';

export const HlcProvider: Provider = {
  provide: HLC_INSTANCE,
  useFactory: () => {
    return new HybridLogicalClock(HUB_ID);
  },
};
