// Config files often serialize choice values with trailing decimal zeros.
export const sameSettingValue = (saved: string, staged: string): boolean => saved === staged ||
  /^-?(?:\d+\.?\d*|\.\d+)$/.test(saved) && /^-?(?:\d+\.?\d*|\.\d+)$/.test(staged) &&
  Number(saved) === Number(staged);
