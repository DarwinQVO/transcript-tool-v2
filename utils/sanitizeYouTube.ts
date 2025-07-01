export function sanitizeYouTube(url: string) {
  if (!url) return null;
  
  // Remove tracking parameters like si=, ab_channel=, etc.
  let clean = url;
  
  // Handle ?si= parameter (common in shortened URLs)
  if (clean.includes('?si=')) {
    clean = clean.split('?si=')[0];
  }
  
  // Handle &si= parameter  
  if (clean.includes('&si=')) {
    clean = clean.split('&si=')[0];
  }
  
  // Handle &ab_channel= parameter
  if (clean.includes('&ab_channel=')) {
    clean = clean.split('&ab_channel=')[0];
  }
  
  // Keep useful parameters like &t= for timestamps
  // Don't remove &t= as it's functional
  
  // Ensure http(s)://
  if (!clean.startsWith("http")) {
    clean = `https://${clean}`;
  }
  
  // CRITICAL FIX: Convert youtu.be to youtube.com format for play-dl compatibility
  if (clean.includes('youtu.be/')) {
    const videoId = clean.split('youtu.be/')[1].split('?')[0].split('&')[0];
    clean = `https://www.youtube.com/watch?v=${videoId}`;
  }
  
  return clean;
}