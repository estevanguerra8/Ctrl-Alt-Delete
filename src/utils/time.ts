export function now(): string {
  return new Date().toISOString();
}

export function minutesFromNow(minutes: number): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

export function hoursFromNow(hours: number): string {
  return minutesFromNow(hours * 60);
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export function timeUntil(expiresAt: string): number {
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, diff);
}

