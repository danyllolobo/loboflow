import { describe, it, expect } from 'vitest';
import { parseDateOnly, formatDateOnly, checkDateStatus, formatRelativeTime } from './date-utils';

describe('date-utils', () => {
  it('correctly parses date-only strings and ISO datetime strings without timezone shift', () => {
    expect(parseDateOnly('2026-10-25')).toBe('2026-10-25');
    expect(parseDateOnly('2026-10-25T00:00:00.000Z')).toBe('2026-10-25');
    expect(parseDateOnly('2026-10-25T23:59:59.999Z')).toBe('2026-10-25');
    expect(parseDateOnly('')).toBeNull();
    expect(parseDateOnly(null)).toBeNull();
    expect(parseDateOnly(undefined)).toBeNull();
  });

  it('formats dates consistently in pt-BR format (DD/MM/YYYY and DD/MM)', () => {
    expect(formatDateOnly('2026-10-25')).toBe('25/10/2026');
    expect(formatDateOnly('2026-10-25T00:00:00.000Z')).toBe('25/10/2026');
    expect(formatDateOnly('2026-10-25', { showYear: false })).toBe('25/10');
    expect(formatDateOnly('2026-03-05', { showYear: false })).toBe('05/03');
    expect(formatDateOnly(null)).toBe('');
  });

  it('correctly calculates overdue and today status against calendar date', () => {
    const formatYmd = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatYmd(yesterday);

    const todayStr = formatYmd(new Date());

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatYmd(tomorrow);

    const yesterdayStatus = checkDateStatus(yesterdayStr);
    expect(yesterdayStatus.isOverdue).toBe(true);
    expect(yesterdayStatus.isToday).toBe(false);

    const todayStatus = checkDateStatus(todayStr);
    expect(todayStatus.isOverdue).toBe(false);
    expect(todayStatus.isToday).toBe(true);

    const tomorrowStatus = checkDateStatus(tomorrowStr);
    expect(tomorrowStatus.isOverdue).toBe(false);
    expect(tomorrowStatus.isToday).toBe(false);
  });

  it('correctly calculates relative time in Portuguese', () => {
    const justNow = new Date();
    expect(formatRelativeTime(justNow)).toBe('agora mesmo');

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    expect(formatRelativeTime(tenMinutesAgo)).toBe('há 10 min');

    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000);
    expect(formatRelativeTime(threeHoursAgo)).toBe('há 3h');
  });
});
