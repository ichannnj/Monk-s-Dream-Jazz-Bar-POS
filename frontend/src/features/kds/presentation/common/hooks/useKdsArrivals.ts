import { useEffect, useRef } from 'react';
import { toast } from '../../../../shared/toast/useToastStore';
import { BarTicket } from '../../barista/types';
import { playKdsChime, playCancellationChime } from '../../../../shared/infrastructure/audio';

export { playKdsChime, playCancellationChime };

interface UseKdsArrivalsProps {
  newTickets: BarTicket[];
  cancelledTickets?: BarTicket[];
  audioChimes: boolean;
  stationName: string;
}

export function useKdsArrivals({
  newTickets,
  cancelledTickets = [],
  audioChimes,
  stationName,
}: UseKdsArrivalsProps) {
  const prevNewTicketIdsRef = useRef<Set<string>>(new Set());
  const prevCancelledIdsRef = useRef<Set<string>>(new Set());
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevNewTicketIdsRef.current = new Set(newTickets.map((t) => t.id));
      prevCancelledIdsRef.current = new Set(cancelledTickets.map((t) => t.id));
      return;
    }

    const prevIds = prevNewTicketIdsRef.current;
    const incomingNewTickets = newTickets.filter(
      (t) => !prevIds.has(t.id) && t.stage !== 'cancelled'
    );

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

    const prevCancelled = prevCancelledIdsRef.current;
    const incomingCancelled = cancelledTickets.filter((t) => !prevCancelled.has(t.id));

    if (incomingCancelled.length > 0) {
      if (audioChimes) {
        playCancellationChime();
      }
      incomingCancelled.forEach((t) => {
        toast.error(`🚨 ORDER VOIDED: ${t.orderNumber} — Stop preparation!`, {
          title: `Ticket Voided at ${stationName}`,
        });
      });
    }

    prevNewTicketIdsRef.current = new Set(newTickets.map((t) => t.id));
    prevCancelledIdsRef.current = new Set(cancelledTickets.map((t) => t.id));
  }, [newTickets, cancelledTickets, audioChimes, stationName]);
}
