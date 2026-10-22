/**
 * Utilitários para manipulação e formatação segura de datas sem deslocamento de fuso horário.
 * Evita o bug de -1 dia comum em fusos como GMT-3 (Brasil) ao formatar datas do tipo YYYY-MM-DD.
 */

export function parseDateOnly(dateValue: string | Date | null | undefined): string | null {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim();
    if (!trimmed) return null;
    return trimmed.split('T')[0] ?? null;
  }
  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    return dateValue.toISOString().split('T')[0] ?? null;
  }
  return null;
}

export function formatDateOnly(
  dateValue: string | Date | null | undefined,
  options?: { showYear?: boolean }
): string {
  const dateStr = parseDateOnly(dateValue);
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts;
  if (!year || !month || !day) return '';
  return options?.showYear === false ? `${day}/${month}` : `${day}/${month}/${year}`;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function checkDateStatus(dateValue: string | Date | null | undefined): {
  isOverdue: boolean;
  isToday: boolean;
  formattedShort: string;
  formattedFull: string;
} {
  const dateStr = parseDateOnly(dateValue);
  if (!dateStr) {
    return { isOverdue: false, isToday: false, formattedShort: '', formattedFull: '' };
  }
  const today = getTodayDateString();
  return {
    isOverdue: dateStr < today,
    isToday: dateStr === today,
    formattedShort: formatDateOnly(dateStr, { showYear: false }),
    formattedFull: formatDateOnly(dateStr, { showYear: true }),
  };
}

export function formatRelativeTime(dateValue: string | Date | null | undefined): string {
  if (!dateValue) return '';
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 45) return 'agora mesmo';
  if (diffInSeconds < 90) return 'há 1 min';

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `há ${diffInMinutes} min`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `há ${diffInHours}h`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) {
    const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `ontem às ${timeStr}`;
  }
  if (diffInDays < 7) return `há ${diffInDays} dias`;

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
