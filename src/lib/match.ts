export function levenshteinDistance(a: string, b: string): number {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function isMatch(query: string, secret: string, threshold = 0.95): boolean {
  const q = query.toLowerCase().trim();
  const s = secret.toLowerCase().trim();
  if (q === s) return true;
  if (!q || !s) return false;
  
  const dist = levenshteinDistance(q, s);
  const maxLen = Math.max(q.length, s.length);
  const similarity = 1 - dist / maxLen;
  
  return similarity >= threshold;
}
