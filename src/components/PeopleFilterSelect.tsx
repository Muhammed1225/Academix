import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { Icon, cx } from './ui';

export interface PeopleFilterOption {
  id: string;
  label: string;
  count: number;
  category?: string;
  keywords?: string[];
}

interface PeopleFilterSelectProps {
  label: string;
  placeholder: string;
  options: PeopleFilterOption[];
  selected: string[];
  onToggle: (id: string) => void;
  maxSelections?: number;
  searchable?: boolean;
  hierarchical?: boolean;
}

export default function PeopleFilterSelect({
  label,
  placeholder,
  options,
  selected,
  onToggle,
  maxSelections = 10,
  searchable = true,
  hierarchical = false,
}: PeopleFilterSelectProps) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const filtered = useMemo(() => {
    const needle = searchable ? query.trim().toLocaleLowerCase() : '';
    return options.filter((option) => !needle ||
      [option.label, option.category, ...(option.keywords ?? [])].some((value) => value?.toLocaleLowerCase().includes(needle)));
  }, [options, query, searchable]);
  const grouped = useMemo(() => {
    if (!hierarchical) return [['', filtered] as [string, PeopleFilterOption[]]];
    const groups = new Map<string, PeopleFilterOption[]>();
    for (const option of filtered) {
      const category = option.category ?? '';
      groups.set(category, [...(groups.get(category) ?? []), option]);
    }
    return [...groups];
  }, [filtered, hierarchical]);

  useEffect(() => {
    if (!open) return;
    searchInput.current?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && filtered[activeIndex]) {
      event.preventDefault();
      if (selected.includes(filtered[activeIndex].id) || selected.length < maxSelections) {
        onToggle(filtered[activeIndex].id);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={root} className="relative min-w-0">
      <span className="mb-1.5 block text-sm font-semibold text-primary">{label}</span>
      <button
        type="button"
        aria-label={`${label}: ${selected.length ? `${selected.length} selected` : placeholder}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        onClick={() => setOpen((value) => !value)}
        className="input flex min-h-11 items-center justify-between gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      >
        <span className={selected.length ? 'truncate text-on-surface' : 'truncate text-on-surface-variant'}>
          {selected.length ? `${selected.length} selected` : placeholder}
        </span>
        <Icon name={open ? 'expand_less' : 'expand_more'} className="shrink-0 text-on-surface-variant" />
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-full min-w-[min(20rem,90vw)] rounded-xl border border-outline-variant bg-white p-2 shadow-float">
          {searchable && <>
            <label htmlFor={`${id}-search`} className="sr-only">Search {label.toLocaleLowerCase()}</label>
            <input
              ref={searchInput}
              id={`${id}-search`}
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls={`${id}-options`}
              aria-activedescendant={filtered[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
              onKeyDown={handleKeyDown}
              placeholder={`Search ${label.toLocaleLowerCase()}...`}
              className="input !py-2 text-sm"
            />
          </>}
          {selected.length >= maxSelections && <p className="px-3 pt-1 text-xs text-on-surface-variant">Select up to {maxSelections} {label.toLocaleLowerCase()}s.</p>}
          <div id={`${id}-options`} role="listbox" aria-label={label} aria-multiselectable="true" className="mt-2 max-h-60 overflow-y-auto">
            {!filtered.length ? (
              <p className="px-3 py-4 text-center text-sm text-on-surface-variant">No matches found.</p>
            ) : grouped.map(([category, entries]) => (
              <div key={category || 'all'} role="group" aria-label={category || label}>
                {category && <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">{category}</p>}
                {entries.map((option) => {
                  const index = filtered.findIndex((entry) => entry.id === option.id);
                  const isSelected = selected.includes(option.id);
                  const selectionLimitReached = selected.length >= maxSelections && !isSelected;
                  return (
                    <button
                      key={option.id}
                      id={`${id}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={selectionLimitReached}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => onToggle(option.id)}
                      className={cx(
                        'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary',
                        index === activeIndex && 'bg-surface-container-low',
                        selectionLimitReached && 'cursor-not-allowed opacity-45',
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span aria-hidden="true" className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded border', isSelected ? 'border-secondary bg-secondary text-white' : 'border-outline-variant')}>
                          {isSelected && <Icon name="check" className="!text-[13px]" />}
                        </span>
                        <span className="truncate">{option.label}</span>
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-on-surface-variant">({option.count})</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t border-outline-variant/50 px-1 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost !h-8 !px-3 text-xs">Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
