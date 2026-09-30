export const releaseApiUrl = 'https://api.github.com/repos/shou-ta/apex-setting-hub/releases/latest';

export type UpdateResult =
  | { status: 'available' | 'current'; latest: string }
  | { status: 'no-release' | 'invalid-release' | 'rate-limited' | 'error'; latest?: string };

export function compareVersions(current: string, latest: string): number | null {
  const parse = (value: string) => /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value.trim())?.slice(1).map(Number);
  const a = parse(current), b = parse(latest);
  if (!a || !b) return null;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return b[i] > a[i] ? 1 : -1;
  }
  return 0;
}

export async function checkForUpdates(currentVersion: string, fetchRelease: typeof fetch = fetch): Promise<UpdateResult> {
  try {
    const response = await fetchRelease(releaseApiUrl, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 404) return { status: 'no-release' };
    if (response.status === 403 || response.status === 429) return { status: 'rate-limited' };
    if (!response.ok) return { status: 'error' };
    const release: unknown = await response.json();
    const latest = typeof release === 'object' && release !== null && 'tag_name' in release && typeof release.tag_name === 'string'
      ? release.tag_name.trim() : '';
    const comparison = compareVersions(currentVersion, latest);
    if (comparison === null) return { status: 'invalid-release', latest };
    return { status: comparison > 0 ? 'available' : 'current', latest };
  } catch {
    return { status: 'error' };
  }
}
