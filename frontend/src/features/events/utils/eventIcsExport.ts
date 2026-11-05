import type { VenueEvent } from '../domain/event.types';

function formatDateToICS(dateStr: string, timeStr?: string | null): string {
  // dateStr is 'YYYY-MM-DD'
  const [year, month, day] = dateStr.split('-');
  let hours = '20';
  let minutes = '00';

  if (timeStr) {
    const parts = timeStr.split(':');
    hours = parts[0].padStart(2, '0');
    minutes = parts[1] ? parts[1].padStart(2, '0') : '00';
  }

  // Local floating time format: YYYYMMDDTHHMMSS
  return `${year}${month}${day}T${hours}${minutes}00`;
}

function escapeICS(str?: string | null): string {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function generateEventIcs(event: VenueEvent): string {
  const dtStart = formatDateToICS(event.event_date, event.start_time);
  const dtEnd = event.end_time
    ? formatDateToICS(event.event_date, event.end_time)
    : formatDateToICS(event.event_date, '23:30:00');

  const summary = escapeICS(event.title);
  let desc = `Performer: ${event.performer_name || 'N/A'}\\nGenre: ${event.genre || 'Jazz'}`;
  if (event.description) desc += `\\n\\n${event.description}`;
  if (event.sound_check_time) desc += `\\n\\nSound Check: ${event.sound_check_time}`;
  if (event.gear_requirements) desc += `\\nGear: ${event.gear_requirements}`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    "PRODID:-//Monk's Dream Jazz Bar//Event Logistics//EN",
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@monksdreamjazzbar.com`,
    `DTSTAMP:${formatDateToICS(new Date().toISOString().slice(0, 10), '12:00:00')}Z`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${escapeICS(desc)}`,
    "LOCATION:Monk's Dream Jazz Bar",
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function generateMonthScheduleIcs(
  events: VenueEvent[],
  calendarTitle = "Monk's Dream Jazz Calendar"
): string {
  const eventBlocks = events.map((event) => {
    const dtStart = formatDateToICS(event.event_date, event.start_time);
    const dtEnd = event.end_time
      ? formatDateToICS(event.event_date, event.end_time)
      : formatDateToICS(event.event_date, '23:30:00');

    const summary = escapeICS(event.title);
    let desc = `Performer: ${event.performer_name || 'N/A'}\\nGenre: ${event.genre || 'Jazz'}`;
    if (event.description) desc += `\\n\\n${event.description}`;

    return [
      'BEGIN:VEVENT',
      `UID:${event.id}@monksdreamjazzbar.com`,
      `DTSTAMP:${formatDateToICS(new Date().toISOString().slice(0, 10), '12:00:00')}Z`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${escapeICS(desc)}`,
      "LOCATION:Monk's Dream Jazz Bar",
      'STATUS:CONFIRMED',
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    "PRODID:-//Monk's Dream Jazz Bar//Event Logistics//EN",
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(calendarTitle)}`,
    ...eventBlocks,
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * Triggers a browser download for a .ics string
 */
export function triggerIcsDownload(icsContent: string, filename: string): void {
  if (typeof window === 'undefined') return;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
