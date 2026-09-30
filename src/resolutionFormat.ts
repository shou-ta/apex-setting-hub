const commonRatios = [
  [16, 9], [16, 10], [4, 3], [5, 4], [3, 2], [32, 9], [1, 1],
] as const;

export function aspectRatio(width: number, height: number, lang: 'ja' | 'en' = 'ja'): string {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0) return '—';
  const ratio = width / height;
  // Display modes such as 1366×768 round the pixel dimensions of a 16:9 screen.
  const common = commonRatios.find(([w,h]) => Math.abs(ratio / (w / h) - 1) <= 0.005);
  if (common) return `${common[0]}:${common[1]}`;
  let a = width, b = height;
  while (b) { [a,b] = [b,a % b]; }
  const exact = `${width / a}:${height / a}`;
  // Group these requested modes without calling their pixel ratio exactly 16:10.
  if (exact === '5:3' || exact === '25:16') return lang === 'ja' ? '16:10系' : '16:10 family';
  return exact;
}

export function resolutionLabel(value: string, lang: 'ja' | 'en' = 'ja'): string {
  if (!/^\d+x\d+$/.test(value)) return '—';
  const [width,height] = value.split('x').map(Number);
  const ratio = aspectRatio(width,height,lang);
  return ratio === '—' ? '—' : `${width} × ${height} (${ratio})`;
}
