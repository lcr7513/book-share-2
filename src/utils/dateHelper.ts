/**
 * Korean Standard Time (KST, UTC+9) Date & Time Formatting Utilities
 */

export function getKoreanTimestamp(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (t: string) => parts.find((p) => p.type === t)?.value || '';

    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');

    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  } catch (e) {
    // Fallback if Intl timeZone fails
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstDate = new Date(date.getTime() + kstOffset);
    return kstDate.toISOString().replace('T', ' ').slice(0, 19);
  }
}

export function getKoreanCreatedAt(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: true,
    });
    return formatter.format(date);
  } catch (e) {
    return getKoreanTimestamp(date);
  }
}
