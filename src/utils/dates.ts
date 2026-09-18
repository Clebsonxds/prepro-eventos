import type { Project, ValidationIssue } from '../types/domain';

function toMs(value: string | null): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function validateProjectChronology(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const aStart = toMs(project.assembly_start);
  const aEnd = toMs(project.assembly_end);
  const eStart = toMs(project.event_start);
  const eEnd = toMs(project.event_end);

  if ((aStart === null) !== (aEnd === null)) {
    issues.push({ id: 'assembly-incomplete', level: 'warning', area: 'event', message: 'Complete o início e o fim da montagem.' });
  }
  if ((eStart === null) !== (eEnd === null)) {
    issues.push({ id: 'event-incomplete', level: 'warning', area: 'event', message: 'Complete o início e o fim do evento.' });
  }
  if (aStart !== null && aEnd !== null && aEnd < aStart) {
    issues.push({ id: 'assembly-order', level: 'error', area: 'event', message: 'O fim da montagem não pode acontecer antes do início.' });
  }
  if (eStart !== null && eEnd !== null && eEnd < eStart) {
    issues.push({ id: 'event-order', level: 'error', area: 'event', message: 'O fim do evento não pode acontecer antes do início.' });
  }
  if (aEnd !== null && eStart !== null && eStart < aEnd) {
    issues.push({ id: 'event-before-assembly-end', level: 'error', area: 'event', message: 'O evento não pode começar antes do término da montagem.' });
  }
  if (aStart !== null && eEnd !== null && aStart > eEnd) {
    issues.push({ id: 'assembly-after-event', level: 'error', area: 'event', message: 'A montagem não pode começar depois do fim do evento.' });
  }
  return issues;
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function durationHours(start: string | null, end: string | null): number | null {
  const a = toMs(start);
  const b = toMs(end);
  if (a === null || b === null || b < a) return null;
  return (b - a) / 3_600_000;
}
