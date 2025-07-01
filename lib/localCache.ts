// Simple in-memory cache: reinicia al hacer npm run dev
const cache = new Map<string, { transcript: string; at: number }>();

export function getCache(key: string, maxAgeSec = 60 * 60 * 24) {
  const hit = cache.get(key);
  if (!hit) return null;
  return Date.now() - hit.at < maxAgeSec * 1000 ? hit.transcript : null;
}

export function setCache(key: string, transcript: string) {
  cache.set(key, { transcript, at: Date.now() });
}