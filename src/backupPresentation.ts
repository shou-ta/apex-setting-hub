export type BackupListItem = { root: string; locked: boolean; created: number };

export function splitBackupGroups<T extends BackupListItem>(
  backups: T[],
  root: string,
  normalLimit = 3,
) {
  const forRoot = backups
    .filter((backup) => backup.root === root)
    .sort((a, b) => b.created - a.created);
  const locked = forRoot.filter((backup) => backup.locked);
  const normal = forRoot.filter((backup) => !backup.locked);

  return {
    locked,
    normalVisible: normal.slice(0, normalLimit),
    normalCollapsed: normal.slice(normalLimit),
    normalCount: normal.length,
  };
}

export function zipExportFilename(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `apex-setting-hub_${year}-${month}-${day}.zip`;
}

export function zipExportTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}
