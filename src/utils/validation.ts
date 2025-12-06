export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function isValidUserId(userId: string): boolean {
  return typeof userId === 'string' && userId.length > 0;
}

export function isValidArchetype(archetype: string): boolean {
  const validArchetypes = ['engineering', 'finance', 'creative', 'business_ops', 'product', 'research'];
  return validArchetypes.includes(archetype);
}

export function isValidDuration(duration: string): boolean {
  return /^\d+[mh]$/.test(duration);
}

export function parseDuration(duration: string): number {
  const match = duration.match(/(\d+)([mh])/);
  if (!match) {
    throw new Error('Invalid duration format');
  }
  const value = parseInt(match[1]);
  const unit = match[2];
  return unit === 'h' ? value * 60 : value;
}
