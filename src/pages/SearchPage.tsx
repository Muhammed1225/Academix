import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import PostCard from '../components/PostCard';
import SearchableSelect from '../components/SearchableSelect';
import { Avatar, Icon, Tag, cx } from '../components/ui';
import { channels, colleges } from '../data/mock';
import { matchesSearch, relevanceScore, rememberSearch, createSearchCatalog, type SearchCategory, type SearchItem } from '../data/search';
import { useApp } from '../store';

const categories: { id: SearchCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'All results', icon: 'search' },
  { id: 'people', label: 'People', icon: 'people' },
  { id: 'universities', label: 'Universities', icon: 'account_balance' },
  { id: 'programmes', label: 'Programmes', icon: 'school' },
  { id: 'posts', label: 'Posts & discussions', icon: 'forum' },
];

const categoryIds = new Set(categories.map(({ id }) => id));
const pageSize = 12;
type SortOrder = 'relevance' | 'recent' | 'discussed' | 'alphabetical';

function safeCategory(value: string | null): SearchCategory | 'all' {
  return value && categoryIds.has(value as SearchCategory | 'all')
    ? value as SearchCategory | 'all'
    : 'all';
}

function uniqueOptions(values: (string | undefined)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((first, second) =>
    first.localeCompare(second, 'en', { sensitivity: 'base' }),
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return text;
  const escapedTokens = tokens.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = text.split(new RegExp(`(${escapedTokens.join('|')})`, 'ig'));
  return (
    <>
      {parts.map((part, index) =>
        tokens.some((token) => part.toLocaleLowerCase().includes(token.toLocaleLowerCase()))
          ? <mark key={`${part}-${index}`} className="rounded bg-tertiary-fixed px-0.5 text-on-surface">{part}</mark>
          : part,
      )}
    </>
  );
}

function SearchResultCard({ item, query }: { item: SearchItem; query: string }) {
  const icon = item.category === 'universities'
    ? 'account_balance'
    : item.category === 'programmes'
      ? 'school'
      : 'person';
  const tag = item.category === 'universities'
    ? 'University'
    : item.category === 'programmes'
      ? 'Programme'
      : 'Mentor';
  const tone = item.category === 'programmes' ? 'blue' : item.category === 'people' ? 'green' : 'neutral';

  return (
    <Link to={item.href} className="card group flex min-w-0 items-center gap-3 p-4 transition hover:shadow-float">
      {item.image
        ? <Avatar src={item.image} name={item.title} size={44} rounded="rounded-full" />
        : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary-fixed text-secondary"><Icon name={icon} /></span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-primary group-hover:text-secondary">
          <Highlight text={item.title} query={query} />
        </span>
        <span className="mt-0.5 block line-clamp-2 text-xs text-on-surface-variant">
          <Highlight text={item.subtitle} query={query} />
        </span>
      </span>
      <Tag tone={tone}>{tag}</Tag>
      <Icon name="arrow_forward" className="text-outline transition group-hover:translate-x-0.5 group-hover:text-secondary" />
    </Link>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  if (options.length < 2) return null;
  return (
    <SearchableSelect
      label={label}
      value={value}
      options={options}
      optional
      onChange={onChange}
    />
  );
}

function FilterPanel({
  category,
  items,
  params,
  defaultSort,
  setFilter,
  reset,
}: {
  category: SearchCategory | 'all';
  items: SearchItem[];
  params: URLSearchParams;
  defaultSort: SortOrder;
  setFilter: (key: string, value: string) => void;
  reset: () => void;
}) {
  const selectedCategoryItems = category === 'all' ? items : items.filter((item) => item.category === category);
  const universityOptions = uniqueOptions(selectedCategoryItems.map((item) => item.university));
  const locations = uniqueOptions(selectedCategoryItems.map((item) => item.location));
  const institutionTypes = uniqueOptions(selectedCategoryItems.map((item) => item.institutionType));
  const disciplines = uniqueOptions(selectedCategoryItems.map((item) => item.discipline));
  const degrees = uniqueOptions(selectedCategoryItems.map((item) => item.degree));
  const channelOptions = channels.map((channel) => channel.id);
  const showUniversity = ['all', 'programmes', 'people', 'posts'].includes(category);
  const activeCount = ['university', 'location', 'institutionType', 'discipline', 'degree', 'channel']
    .filter((key) => params.has(key)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-primary">Filters{activeCount ? ` (${activeCount})` : ''}</h2>
        <button type="button" onClick={reset} className="text-xs font-semibold text-secondary hover:underline">Reset</button>
      </div>
      {showUniversity && <FilterSelect label="University" value={params.get('university') ?? ''} options={universityOptions} onChange={(value) => setFilter('university', value)} />}
      {category === 'universities' && (
        <>
          <FilterSelect label="Location" value={params.get('location') ?? ''} options={locations} onChange={(value) => setFilter('location', value)} />
          <FilterSelect label="Institution type" value={params.get('institutionType') ?? ''} options={institutionTypes} onChange={(value) => setFilter('institutionType', value)} />
        </>
      )}
      {(category === 'all' || category === 'programmes') && (
        <>
          <FilterSelect label="Discipline" value={params.get('discipline') ?? ''} options={disciplines} onChange={(value) => setFilter('discipline', value)} />
          <FilterSelect label="Degree level" value={params.get('degree') ?? ''} options={degrees} onChange={(value) => setFilter('degree', value)} />
        </>
      )}
      {category === 'posts' && (
        <label className="block text-sm font-semibold text-primary">
          Discussion topic
          <select
            value={params.get('channel') ?? ''}
            onChange={(event) => setFilter('channel', event.target.value)}
            className="input mt-2 !py-2.5"
          >
            <option value="">All topics</option>
            {channelOptions.map((channelId) => (
              <option key={channelId} value={channelId}>{channels.find((channel) => channel.id === channelId)?.name ?? channelId}</option>
            ))}
          </select>
        </label>
      )}
      {category === 'people' && <FilterSelect label="Location" value={params.get('location') ?? ''} options={locations} onChange={(value) => setFilter('location', value)} />}
      <label className="block text-sm font-semibold text-primary">
        Sort by
        <select
          value={params.get('sort') ?? defaultSort}
          onChange={(event) => setFilter('sort', event.target.value)}
          className="input mt-2 !py-2.5"
        >
          <option value="relevance">Most relevant</option>
          <option value="alphabetical">Alphabetical</option>
          {category === 'all' || category === 'posts' ? <option value="recent">Most recent</option> : null}
          {category === 'all' || category === 'posts' ? <option value="discussed">Most discussed</option> : null}
        </select>
      </label>
    </div>
  );
}

function FilterChip({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <button type="button" onClick={onRemove} className="inline-flex items-center gap-1.5 rounded-full bg-secondary-fixed px-3 py-1.5 text-xs font-semibold text-on-secondary-fixed hover:bg-secondary/15">
      {children}<Icon name="close" className="!text-[14px]" />
    </button>
  );
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const posts = useApp((state) => state.posts);
  const [draftQuery, setDraftQuery] = useState(params.get('q') ?? '');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [desktopFiltersOpen, setDesktopFiltersOpen] = useState(true);
  const query = (params.get('q') ?? '').trim();
  const requestedUniversity = params.get('university') ?? '';
  const legacyCollege = colleges.find((college) => college.id === requestedUniversity);
  const category = params.get('type') ? safeCategory(params.get('type')) : legacyCollege ? 'posts' : 'all';
  const universityFilter = legacyCollege?.name ?? requestedUniversity;
  const catalog = useMemo(() => createSearchCatalog(posts), [posts]);
  const defaultSort: SortOrder = category === 'posts' && !query ? 'recent' : query ? 'relevance' : 'alphabetical';
  const filterParams = new URLSearchParams(params);
  if (legacyCollege) filterParams.set('university', legacyCollege.name);

  useEffect(() => {
    setDraftQuery(params.get('q') ?? '');
  }, [params]);

  const queryMatches = catalog.filter((item) => matchesSearch(`${item.title} ${item.content} ${item.subtitle}`, query));
  const passesFilters = (item: SearchItem) => {
    if (legacyCollege && item.category !== 'posts') return false;
    if (universityFilter && item.university !== universityFilter
      && !(item.category === 'universities' && item.title === universityFilter)) return false;
    if (params.get('location') && item.location !== params.get('location')) return false;
    if (params.get('institutionType') && item.institutionType !== params.get('institutionType')) return false;
    if (params.get('discipline') && item.discipline !== params.get('discipline')) return false;
    if (params.get('degree') && item.degree !== params.get('degree')) return false;
    if (params.get('channel') && item.channelId !== params.get('channel')) return false;
    return true;
  };
  const filteredItems = queryMatches.filter((item) =>
    (category === 'all' || item.category === category) && passesFilters(item),
  );

  const sortOrder = (params.get('sort') ?? defaultSort) as SortOrder;
  const sortedItems = [...filteredItems].sort((first, second) => {
    if (sortOrder === 'alphabetical') return first.title.localeCompare(second.title, 'en', { sensitivity: 'base' });
    if (sortOrder === 'discussed') return (second.post?.commentCount ?? 0) - (first.post?.commentCount ?? 0);
    if (sortOrder === 'recent') {
      const firstIndex = posts.findIndex((post) => post.id === first.post?.id);
      const secondIndex = posts.findIndex((post) => post.id === second.post?.id);
      return (firstIndex < 0 ? Number.MAX_SAFE_INTEGER : firstIndex) - (secondIndex < 0 ? Number.MAX_SAFE_INTEGER : secondIndex);
    }
    return relevanceScore(second, query) - relevanceScore(first, query);
  });

  const requestedPage = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const pageCount = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const pageItems = sortedItems.slice((page - 1) * pageSize, page * pageSize);
  const activeFilters = ['university', 'location', 'institutionType', 'discipline', 'degree', 'channel']
    .map((key) => [key, params.get(key)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1]));
  const activeFilterCount = activeFilters.length;

  const updateParams = (updates: Record<string, string>, remove: string[] = []) => {
    const next = new URLSearchParams(params);
    for (const key of remove) next.delete(key);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in updates)) next.delete('page');
    setParams(next);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draftQuery.trim().replace(/\s+/g, ' ');
    if (trimmed) rememberSearch(trimmed);
    updateParams({ q: trimmed });
  };

  const setFilter = (key: string, value: string) => updateParams({ [key]: value });
  const setCategory = (nextCategory: SearchCategory | 'all') => {
    const remove = nextCategory === 'universities'
      ? ['discipline', 'degree', 'channel']
      : nextCategory === 'programmes'
        ? ['location', 'institutionType', 'channel']
        : nextCategory === 'people'
          ? ['institutionType', 'discipline', 'degree', 'channel']
          : nextCategory === 'posts'
            ? ['location', 'institutionType', 'discipline', 'degree']
            : ['institutionType', 'channel'];
    updateParams({ type: nextCategory === 'all' ? '' : nextCategory }, remove);
  };
  const resetFilters = () => updateParams({}, ['university', 'location', 'institutionType', 'discipline', 'degree', 'channel']);
  const clearAll = () => {
    setParams({});
    setMobileFiltersOpen(false);
  };

  const chips = activeFilters.map(([key, value]) => ({
    key,
    value: key === 'channel'
      ? channels.find((channel) => channel.id === value)?.name ?? value
      : key === 'university' && legacyCollege
        ? legacyCollege.name
        : value,
  }));

  const categoryCounts = new Map<SearchCategory | 'all', number>([['all', 0]]);
  for (const item of queryMatches.filter(passesFilters)) {
    categoryCounts.set('all', (categoryCounts.get('all') ?? 0) + 1);
    categoryCounts.set(item.category, (categoryCounts.get(item.category) ?? 0) + 1);
  }

  const filtersContent = (
    <FilterPanel
      category={category}
      items={queryMatches}
      params={filterParams}
      defaultSort={defaultSort}
      setFilter={setFilter}
      reset={resetFilters}
    />
  );

  return (
    <div className="mx-auto max-w-content space-y-6">
      <header className="space-y-4">
        <div>
          <p className="eyebrow text-secondary">Academix discovery</p>
          <h1 className="mt-1 font-headline text-3xl font-semibold text-primary">
            {legacyCollege ? `Posts about ${legacyCollege.shortName}` : query ? <>Results for “{query}”</> : 'Search Academix'}
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            {sortedItems.length} {sortedItems.length === 1 ? 'result' : 'results'} across people, universities, programmes, and discussions.
          </p>
        </div>
        <form onSubmit={submitSearch} className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search Academix</span>
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input
              value={draftQuery}
              onChange={(event) => setDraftQuery(event.target.value)}
              placeholder="Search people, universities, programmes, or discussions"
              className="input !py-3 pl-10"
            />
          </label>
          {draftQuery && (
            <button type="button" onClick={() => { setDraftQuery(''); updateParams({ q: '' }); }} aria-label="Clear search query" className="btn-outline !px-3">
              <Icon name="close" />
            </button>
          )}
          <button type="submit" className="btn-primary !px-4" aria-label="Submit search">
            <Icon name="search" /><span className="hidden sm:inline">Search</span>
          </button>
        </form>
      </header>

      <nav aria-label="Search result categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {categories.map((entry) => {
          const count = categoryCounts.get(entry.id) ?? 0;
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={category === entry.id}
              onClick={() => setCategory(entry.id)}
              className={cx(
                'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition',
                category === entry.id ? 'border-secondary bg-secondary text-white' : 'border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low',
              )}
            >
              <Icon name={entry.icon} className="!text-[18px]" />{entry.label}
              <span className={cx('rounded-full px-1.5 text-xs', category === entry.id ? 'bg-white/20' : 'bg-surface-container-low')}>{count}</span>
            </button>
          );
        })}
      </nav>

      {(query || chips.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-on-surface-variant">Active:</span>
          {query && <FilterChip onRemove={() => updateParams({ q: '' })}>Query: {query}</FilterChip>}
          {chips.map(({ key, value }) => <FilterChip key={key} onRemove={() => setFilter(key, '')}>{value}</FilterChip>)}
          {(query || chips.length > 0) && <button type="button" onClick={clearAll} className="text-xs font-semibold text-secondary hover:underline">Clear all</button>}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 lg:hidden">
        <p className="text-sm text-on-surface-variant">{activeFilterCount ? `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'}` : 'Narrow your results'}</p>
        <button type="button" onClick={() => setMobileFiltersOpen(true)} className="btn-outline !py-2">
          <Icon name="tune" />Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
        </button>
      </div>

      <div className="hidden justify-end lg:flex">
        <button
          type="button"
          aria-expanded={desktopFiltersOpen}
          onClick={() => setDesktopFiltersOpen((open) => !open)}
          className="btn-outline !py-2"
        >
          <Icon name={desktopFiltersOpen ? 'left_panel_close' : 'tune'} />
          {desktopFiltersOpen ? 'Hide filters' : 'Show filters'}
        </button>
      </div>
      <div className={cx('grid gap-6', desktopFiltersOpen ? 'lg:grid-cols-[250px_minmax(0,1fr)]' : 'lg:grid-cols-1')}>
        {desktopFiltersOpen && <aside className="hidden self-start rounded-2xl border border-outline-variant/60 bg-white p-5 lg:sticky lg:top-24 lg:block">
          {filtersContent}
        </aside>}

        <section aria-live="polite" className="min-w-0 space-y-3">
          {pageItems.length ? pageItems.map((item) => item.post
            ? <PostCard key={item.id} post={item.post} />
            : <SearchResultCard key={item.id} item={item} query={query} />) : (
            <div className="card p-8 text-center sm:p-12">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-fixed text-secondary"><Icon name="search_off" /></span>
              <h2 className="mt-4 font-semibold text-primary">No matching results</h2>
              <p className="mt-1 text-sm text-on-surface-variant">Try a different keyword or remove a filter to broaden your search.</p>
              {(activeFilterCount > 0 || query) && (
                <button type="button" onClick={clearAll} className="btn-outline mt-4">Clear search and filters</button>
              )}
            </div>
          )}
          {sortedItems.length > pageSize && (
            <nav aria-label="Search result pages" className="flex items-center justify-center gap-3 pt-4">
              <button type="button" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })} className="btn-outline !py-2 disabled:cursor-not-allowed disabled:opacity-50">
                <Icon name="chevron_left" />Previous
              </button>
              <span className="text-sm text-on-surface-variant">Page {Math.min(page, pageCount)} of {pageCount}</span>
              <button type="button" disabled={page >= pageCount} onClick={() => updateParams({ page: String(page + 1) })} className="btn-outline !py-2 disabled:cursor-not-allowed disabled:opacity-50">
                Next<Icon name="chevron_right" />
              </button>
            </nav>
          )}
        </section>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-white p-5 sm:p-8 lg:hidden">
          <div className="mx-auto max-w-lg">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-headline text-xl font-semibold text-primary">Filter results</h2>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters" className="btn-ghost !p-2"><Icon name="close" /></button>
            </div>
            {filtersContent}
            <div className="mt-8 flex gap-3 border-t border-outline-variant/50 pt-5">
              <button type="button" onClick={() => { resetFilters(); setMobileFiltersOpen(false); }} className="btn-outline flex-1 justify-center">Reset</button>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} className="btn-primary flex-1 justify-center">Apply filters</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
