import majorsText from '../../data/majors.txt?raw';
import universitiesText from '../../data/universities.txt?raw';

function parseOptions(source: string) {
  const uniqueOptions = new Map<string, string>();
  for (const line of source.split(/\r?\n/)) {
    const option = line.trim();
    if (option) {
      const key = option.normalize('NFC').toLocaleLowerCase('az').replace(/[ıİ]/g, 'i');
      if (!uniqueOptions.has(key)) uniqueOptions.set(key, option);
    }
  }
  return [...uniqueOptions.values()].sort((first, second) => first.localeCompare(second, 'az', { sensitivity: 'base' }));
}

export const universities = parseOptions(universitiesText);
export const majors = parseOptions(majorsText);

export function educationOptionId(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en')
    .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const universityAliases: Record<string, string> = {
  'baku higher oil school': 'Baku Higher Oil School (BHOS)',
  bhos: 'Baku Higher Oil School (BHOS)',
  banm: 'Baku Higher Oil School (BHOS)',
  'bhos (banm)': 'Baku Higher Oil School (BHOS)',
  'bhos banm': 'Baku Higher Oil School (BHOS)',
  ada: 'ADA University',
};

export function universityOptionId(value: string) {
  const normalized = value.trim().normalize('NFC').toLocaleLowerCase('en');
  const canonical = universityAliases[normalized] ?? universities.find((name) => name.toLocaleLowerCase('en') === normalized);
  return canonical ? educationOptionId(canonical) : '';
}

export function universityNameForId(id: string) {
  return universities.find((name) => universityOptionId(name) === id);
}
