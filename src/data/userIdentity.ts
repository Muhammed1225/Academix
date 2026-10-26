export function displayName(name?: string | null, email?: string | null) {
  const candidate = name?.trim();
  if (!candidate || candidate.includes('@')) return 'Academix member';

  const emailLocalPart = email?.split('@')[0]?.replace(/[._+-]/g, '').toLocaleLowerCase();
  const normalizedCandidate = candidate.replace(/[\s._+-]/g, '').toLocaleLowerCase();
  if (emailLocalPart && normalizedCandidate === emailLocalPart) return 'Academix member';
  if (!/\s/.test(candidate) && /[a-z]\d{2,}$/i.test(candidate)) return 'Academix member';

  return candidate;
}

export function initialsForName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return (parts[0] ?? 'A').slice(0, 2).toLocaleUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase();
}

export function avatarColor(name: string) {
  const palette = [
    '#1d4ed8',
    '#0f766e',
    '#7c3aed',
    '#be123c',
    '#b45309',
    '#047857',
    '#4338ca',
    '#c2410c',
  ];
  let hash = 0;
  for (const character of name.toLocaleLowerCase()) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}
