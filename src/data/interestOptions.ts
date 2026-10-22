import interestsText from '../../data/interests.txt?raw';

const uniqueInterests = new Map<string, string>();
for (const line of interestsText.split(/\r?\n/)) {
  const interest = line.trim();
  if (interest) uniqueInterests.set(interest.toLocaleLowerCase(), interest);
}

export const interests = [...uniqueInterests.values()];

export const interestEmojis: Record<string, string> = {
  Film: '🎬',
  'TV Series': '📺',
  Books: '📚',
  'Language Learning': '🗣️',
  Programming: '💻',
  Cybersecurity: '🔐',
  Technology: '💻',
  'Artificial Intelligence': '🤖',
  Science: '🔬',
  Psychology: '🧠',
  Philosophy: '💭',
  History: '🏛️',
  Music: '🎵',
  'Art and Design': '🎨',
  Photography: '📸',
  Gaming: '🎮',
  'Sports and Fitness': '⚽',
  Travel: '✈️',
  Cooking: '🍳',
  'Business and Entrepreneurship': '💼',
};

export const defaultInterestEmoji = '✨';
