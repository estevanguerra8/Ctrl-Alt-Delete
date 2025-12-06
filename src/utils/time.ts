export function now(): string {
  return new Date().toISOString();
}

export function minutesFromNow(minutes: number): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

export function hoursFromNow(hours: number): string {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export function parseDuration(duration: string): number {
  // Parse "30m" -> 30, "2h" -> 120
  const match = duration.match(/^(\d+)([mh])$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  return unit === 'h' ? value * 60 : value;
}

