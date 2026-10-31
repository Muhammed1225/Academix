import { useEffect, useId, useState, type KeyboardEvent } from 'react';

import { cx, Icon } from './ui';

type SearchableSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  optional?: boolean;
  error?: string;
};

function normalizeSearch(value: string) {
  return value.normalize('NFC').toLocaleLowerCase('az').replace(/[ıİ]/g, 'i');
}

export default function SearchableSelect({ label, value, onChange, options, optional = false, error }: SearchableSelectProps) {
  const id = useId();
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const filteredOptions = options.filter((option) => normalizeSearch(option).includes(normalizeSearch(query)));
  const placeholder = `Select ${label.toLowerCase()}${optional ? ' (optional)' : ''}`;

  useEffect(() => {
    if (!isOpen) setQuery(value);
  }, [isOpen, value]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => filteredOptions.length ? Math.min(index + 1, filteredOptions.length - 1) : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => filteredOptions.length ? Math.max(index - 1, 0) : 0);
    } else if (event.key === 'Enter' && isOpen && filteredOptions[activeIndex]) {
      event.preventDefault();
      chooseOption(filteredOptions[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setQuery(value);
    }
  };

  const chooseOption = (option: string) => {
    setQuery(option);
    onChange(option);
    setIsOpen(false);
  };

  return <div className="relative block min-w-0 text-sm font-semibold">
    <label htmlFor={id}>{label}{optional && <span className="font-normal text-on-surface-variant"> (optional)</span>}</label>
    <span className="relative mt-2 block">
    <input
      id={id}
      type="text"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={isOpen}
      aria-controls={`${id}-options`}
      aria-activedescendant={isOpen && filteredOptions[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : undefined}
      autoComplete="off"
      value={query}
      onChange={(event) => {
        setQuery(event.target.value);
        onChange('');
        setActiveIndex(0);
        setIsOpen(true);
      }}
      onFocus={() => {
        setQuery('');
        setActiveIndex(0);
        setIsOpen(true);
      }}
      onBlur={() => {
        setIsOpen(false);
        setQuery(value);
      }}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className="input w-full !bg-surface-container-low/40 !py-[9px] pr-10"
    />
    <Icon name={isOpen ? 'expand_less' : 'expand_more'} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
    </span>
    {isOpen && <ul id={`${id}-options`} role="listbox" className="absolute left-0 right-0 z-30 mt-1 max-h-60 overflow-y-auto rounded-lg border border-outline-variant bg-white py-1 shadow-float">
      {filteredOptions.length ? filteredOptions.map((option, index) => <li
          key={option}
          id={`${id}-option-${index}`}
          role="option"
          aria-selected={option === value}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => chooseOption(option)}
          className={cx('cursor-pointer px-3.5 py-2 text-sm font-normal text-on-surface hover:bg-surface-container-low', index === activeIndex && 'bg-surface-container-low')}
        >
          {option}
        </li>) : <li role="option" aria-disabled="true" className="px-3.5 py-2 text-sm font-normal text-on-surface-variant">No results found</li>}
    </ul>}
    {error && <span id={`${id}-error`} role="alert" className="mt-1 block text-xs font-medium text-error">{error}</span>}
  </div>;
}
