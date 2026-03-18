export function createId(prefix: string) {
  // Stable enough for demo without external deps
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

