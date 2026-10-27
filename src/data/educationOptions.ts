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
