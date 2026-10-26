import { useEffect, useRef } from 'react';
import { toast } from '../../../../shared/toast/useToastStore';
import { BarTicket } from '../../barista/types';

import { playKdsChime } from '../../../../shared/infrastructure/audio';
export { playKdsChime };

interface UseKdsArrivalsProps {
  newTickets: BarTicket[];
  audioChimes: boolean;
  stationName: string;
}

export function useKdsArrivals({ newTickets, audioChimes, stationName }: UseKdsArrivalsProps) {
  const prevNewTicketIdsRef = useRef<Set<string>>(new Set());
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevNewTicketIdsRef.current = new Set(newTickets.map((t) => t.id));
      return;
    }

    const prevIds = prevNewTicketIdsRef.current;
    const incomingNewTickets = newTickets.filter((t) => !prevIds.has(t.id));

    if (incomingNewTickets.length > 0) {
      if (audioChimes) {
        playKdsChime();
      }
      incomingNewTickets.forEach((t) => {
        const roundText = t.roundNumber && t.roundNumber > 1 ? ` (Round ${t.roundNumber})` : '';
        toast.info(`🔔 New Order: ${t.orderNumber}${roundText} JUST IN`, {
          title: `New Ticket at ${stationName}`,
        });
      });
    }

    prevNewTicketIdsRef.current = new Set(newTickets.map((t) => t.id));
  }, [newTickets, audioChimes, stationName]);
}
