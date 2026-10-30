import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Avatar, Icon, Tag, cx } from '../components/ui';
import PeopleFilterSelect, { type PeopleFilterOption } from '../components/PeopleFilterSelect';
import UserAvatar from '../components/UserAvatar';
import { colleges } from '../data/mock';
import { defaultInterestEmoji, interestEmojis, interests as signupInterests } from '../data/interestOptions';
import { majors, universities } from '../data/educationOptions';
import type { ConnectionRole } from '../data/types';
import { peopleOptionId, searchPeople, universitySearchKeywords, type PeopleDegreeLevel, type PeopleFilters, type PeoplePerson, type PeopleResponse, type PeopleRole, type PeopleSort, type PeopleYear } from '../peopleService';
import { useApp } from '../store';

const connections = colleges.flatMap((college) =>
  college.mentors.map((mentor) => ({ college, mentor })),
);
const initialPreferences = ['15-122 Rigor', 'SCS Supplemental Essay'];
const interestsPerPage = 12;
const connectionRoles: Record<ConnectionRole, { label: string; icon: string }> = {
  prospective: { label: 'Prospective student', icon: 'person_search' },
  scholar: { label: 'Student / Scholar', icon: 'school' },
  faculty: { label: 'Faculty representative', icon: 'account_balance' },
};
const connectionRoleIds: ConnectionRole[] = ['prospective', 'scholar', 'faculty'];
const yearOptions: { id: PeopleYear; label: string }[] = [
  { id: '1', label: '1st' },
  { id: '2', label: '2nd' },
  { id: '3', label: '3rd' },
  { id: '4', label: '4th' },
  { id: '5+', label: '5th+' },
  { id: 'graduate', label: 'Graduate / Alumni' },
];
const degreeLevelOptions: { id: PeopleDegreeLevel; label: string }[] = [
  { id: 'bachelors', label: "Bachelor's" },
  { id: 'masters', label: "Master's" },
  { id: 'phd', label: 'PhD' },
];
const sortOptions: { value: PeopleSort; label: string }[] = [
  { value: 'best-match', label: 'Best match' },
  { value: 'same-university', label: 'Same university as me' },
  { value: 'same-major', label: 'Same major as me' },
  { value: 'year-ascending', label: 'Year (low to high)' },
  { value: 'recently-active', label: 'Recently active' },
  { value: 'name-ascending', label: 'Name (A-Z)' },
];
const languageOptions = ['Azerbaijani', 'English', 'Turkish', 'Russian', 'Arabic', 'French', 'German', 'Spanish'];
const peopleFilterConfig = [
  { id: 'universities', label: 'University', optionsSource: 'universities', searchable: true, hierarchical: false },
  { id: 'majors', label: 'Major', optionsSource: 'majors', searchable: true, hierarchical: true },
] as const;

function majorCategory(name: string) {
  if (/computer|software|artificial intelligence|data science|cybersecurity|information systems|information technology/i.test(name)) return 'Computer Science & AI';
  if (/engineering|robot|architecture|urban planning/i.test(name)) return 'Engineering & Robotics';
  if (/business|econom|finance|account|marketing|management|trade|entrepreneurship|banking/i.test(name)) return 'Business & Info Systems';
  if (/medicine|dentistry|pharmacy|health|nursing|medical|physiotherapy/i.test(name)) return 'Medicine & Health';
  if (/biology|biotech|ecology|agronomy|veterinary|forestry|plant|soil|aquaculture|chemistry|physics|math|statistics/i.test(name)) return 'Science & Mathematics';
  return 'Arts, Humanities & Other';
}

function csvParams(params: URLSearchParams, name: string) {
  return params.getAll(name).flatMap((value) => value.split(',')).filter(Boolean);
}

export default function ConnectionsPage() {
  const showToast = useApp((s) => s.showToast);
  const user = useApp((s) => s.user);
  const openMiniChatForPerson = useApp((s) => s.openMiniChatForPerson);
  const [searchParams, setSearchParams] = useSearchParams();
  const [rememberedParams] = useState(() => sessionStorage.getItem('academix.make-connections.filters') ?? '');
  const [restoredFilters, setRestoredFilters] = useState(false);
  const [peopleResults, setPeopleResults] = useState<PeopleResponse | null>(null);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [peopleLoadingMore, setPeopleLoadingMore] = useState(false);
  const loadMoreController = useRef<AbortController | null>(null);
  const mobileFilterTrigger = useRef<HTMLButtonElement>(null);
  const mobileFilterPanel = useRef<HTMLDivElement>(null);
  const wasMobileFiltersOpen = useRef(false);
  const [peopleError, setPeopleError] = useState('');
  const [peopleQuery, setPeopleQuery] = useState(() => searchParams.get('q') ?? '');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState(() => searchParams.get('location') ?? '');
  const [requested, setRequested] = useState<string[]>([]);
  const [interestSearch, setInterestSearch] = useState('');
  const [visibleInterestCount, setVisibleInterestCount] = useState(interestsPerPage);
  const paramKey = searchParams.toString();
  useEffect(() => {
    if (restoredFilters) return;
    setRestoredFilters(true);
    if (!paramKey && rememberedParams) setSearchParams(new URLSearchParams(rememberedParams), { replace: true });
  }, [paramKey, rememberedParams, restoredFilters, setSearchParams]);
  useEffect(() => {
    sessionStorage.setItem('academix.make-connections.filters', paramKey);
  }, [paramKey]);
  const selectedRoles = csvParams(searchParams, 'roles').map((role) => role === 'student' ? 'scholar' : role).filter((role): role is ConnectionRole => connectionRoleIds.includes(role as ConnectionRole));
  const selectedUniversities = csvParams(searchParams, 'universities');
  const selectedMajors = csvParams(searchParams, 'majors');
  const selectedYears = csvParams(searchParams, 'years') as PeopleYear[];
  const selectedLevels = csvParams(searchParams, 'levels') as PeopleDegreeLevel[];
  const preferences = searchParams.has('interests')
    ? csvParams(searchParams, 'interests').filter((interest) => interest !== 'none')
    : searchParams.has('university') ? [] : initialPreferences;
  const sortValue = searchParams.get('sort');
  const sort = sortOptions.some((option) => option.value === sortValue)
    ? sortValue as PeopleSort
    : 'best-match';
  const graduationYears = csvParams(searchParams, 'graduationYears');
  const intakeYears = csvParams(searchParams, 'intakeYears');
  const languages = csvParams(searchParams, 'languages');
  const extraFilters = {
    openToMessages: searchParams.get('openToMessages') === 'true',
    openToMentoring: searchParams.get('openToMentoring') === 'true',
    verifiedOnly: searchParams.get('verified') === 'true',
  };
  const studentYearDisabled = selectedRoles.length > 0 && !selectedRoles.includes('scholar');
  const updateParams = (updates: Record<string, string[] | string | null>, replace = false) => {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      params.delete(key);
      if (Array.isArray(value)) {
        if (value.length) params.set(key, value.join(','));
        else if (key === 'interests') params.set(key, 'none');
      } else if (value !== null && value !== '') {
        params.set(key, value);
      }
    }
    setSearchParams(params, { replace });
  };
  const selectedRoleParams = selectedRoles.map((role) => role === 'scholar' ? 'student' : role);
  const filters = useMemo<PeopleFilters>(() => {
    const params = new URLSearchParams(paramKey);
    const roles = csvParams(params, 'roles').filter((role): role is PeopleRole =>
      ['student', 'prospective', 'faculty'].includes(role));
    const querySort = params.get('sort');
    return {
      roles,
      universities: csvParams(params, 'universities'),
      majors: csvParams(params, 'majors'),
      years: csvParams(params, 'years') as PeopleYear[],
      levels: csvParams(params, 'levels') as PeopleDegreeLevel[],
      interests: params.has('interests')
        ? csvParams(params, 'interests').filter((interest) => interest !== 'none')
        : params.has('university') ? [] : initialPreferences,
      query: peopleQuery,
      sort: sortOptions.some((option) => option.value === querySort) ? querySort as PeopleSort : 'best-match',
      location: params.get('location') ?? '',
      graduationYears: csvParams(params, 'graduationYears'),
      intakeYears: csvParams(params, 'intakeYears'),
      languages: csvParams(params, 'languages'),
      openToMessages: params.get('openToMessages') === 'true',
      openToMentoring: params.get('openToMentoring') === 'true',
      verifiedOnly: params.get('verified') === 'true',
    };
  }, [paramKey, peopleQuery]);
  const universityFacetMap = new Map((peopleResults?.facets.universities ?? []).map((facet) => [facet.id, facet]));
  const majorFacetMap = new Map((peopleResults?.facets.majors ?? []).map((facet) => [facet.id, facet]));
  const universityFilterOptions: PeopleFilterOption[] = universities.map((name) => {
    const id = peopleOptionId(name);
    const facet = universityFacetMap.get(id);
    const aliases = universitySearchKeywords(name);
    return { id, label: name, count: facet?.count ?? 0, keywords: aliases };
  });
  const majorFilterOptions: PeopleFilterOption[] = majors.map((name) => {
    const id = peopleOptionId(name);
    return { id, label: name, count: majorFacetMap.get(id)?.count ?? 0, category: majorCategory(name) };
  });
  const optionsBySource = { universities: universityFilterOptions, majors: majorFilterOptions };
  const selectedByFilter = { universities: selectedUniversities, majors: selectedMajors };
  const configuredPeopleFilters = peopleFilterConfig.map((config) => ({
    ...config,
    options: optionsBySource[config.optionsSource],
    selected: selectedByFilter[config.id],
    placeholder: config.id === 'universities' ? 'Any university' : 'Any major',
  }));
  const university = colleges.find((college) => college.id === searchParams.get('university'));
  const affiliatedConnections = university
    ? connections.filter(({ college }) => college.id === university.id)
    : connections;
  const filteredInterests = signupInterests.filter((interest) =>
    interest.toLocaleLowerCase().includes(interestSearch.trim().toLocaleLowerCase()),
  );
  const visibleInterests = filteredInterests.slice(0, visibleInterestCount);

  const recommendations = affiliatedConnections
    .filter(({ mentor }) => !selectedRoles.length || selectedRoles.includes(mentor.role))
    .filter(({ mentor }) => !preferences.length || mentor.tags.some((tag) => preferences.includes(tag)))
    .sort(
      (a, b) =>
        b.mentor.tags.filter((tag) => preferences.includes(tag)).length -
        a.mentor.tags.filter((tag) => preferences.includes(tag)).length,
    );

  const searchQueryParam = searchParams.get('q');
  const searchLocationParam = searchParams.get('location');
  useEffect(() => {
    setPeopleQuery(searchQueryParam ?? '');
    setLocationFilter(searchLocationParam ?? '');
  }, [paramKey, searchQueryParam, searchLocationParam]);

  useEffect(() => {
    if (!mobileFiltersOpen) {
      if (wasMobileFiltersOpen.current) mobileFilterTrigger.current?.focus();
      wasMobileFiltersOpen.current = false;
      return;
    }
    wasMobileFiltersOpen.current = true;
    mobileFilterPanel.current?.querySelector<HTMLElement>('button, input, select')?.focus();
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if ((event.target as HTMLElement).closest('[role="combobox"]')) return;
        setMobileFiltersOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !mobileFilterPanel.current) return;
      const focusable = [...mobileFilterPanel.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleDialogKeys);
    return () => document.removeEventListener('keydown', handleDialogKeys);
  }, [mobileFiltersOpen]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setPeopleLoading(true);
      setPeopleLoadingMore(false);
      loadMoreController.current?.abort();
      setPeopleError('');
      void searchPeople(filters, user?.id ?? '', controller.signal)
        .then((result) => {
          setPeopleResults(result);
          setPeopleLoading(false);
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          setPeopleError(error instanceof Error ? error.message : 'Unable to search people right now.');
          setPeopleLoading(false);
        });
    }, filters.query || filters.location ? 300 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      loadMoreController.current?.abort();
    };
  }, [filters, user?.id]);

  const togglePreference = (interest: string) => {
    const next = preferences.includes(interest)
      ? preferences.filter((item) => item !== interest)
      : [...preferences, interest];
    updateParams({ interests: next });
  };

  const requestConnection = (id: string, name: string) => {
    setRequested((current) => (current.includes(id) ? current : [...current, id]));
    showToast(`Connection request sent to ${name}`, 'person_add');
  };

  const clearAll = () => {
    updateParams({
      roles: [],
      universities: [],
      majors: [],
      years: [],
      levels: [],
      interests: [],
      q: null,
      sort: 'best-match',
      location: null,
      openToMessages: null,
      openToMentoring: null,
      verified: null,
      graduationYears: [],
      intakeYears: [],
      languages: [],
    });
  };

  const loadMorePeople = async () => {
    if (!peopleResults?.nextCursor || peopleLoadingMore) return;
    setPeopleLoadingMore(true);
    const controller = new AbortController();
    loadMoreController.current = controller;
    try {
      const next = await searchPeople(filters, user?.id ?? '', controller.signal, peopleResults.nextCursor);
      setPeopleResults((current) => current ? { ...next, items: [...current.items, ...next.items] } : next);
    } catch (error) {
      if (controller.signal.aborted) return;
      setPeopleError(error instanceof Error ? error.message : 'Unable to load more people.');
    } finally {
      if (!controller.signal.aborted) setPeopleLoadingMore(false);
    }
  };

  const removeFilter = (key: string, value: string) => {
    if (key === 'roles') updateParams({ roles: selectedRoleParams.filter((item) => item !== value) });
    else if (key === 'universities') updateParams({ universities: selectedUniversities.filter((item) => item !== value) });
    else if (key === 'majors') updateParams({ majors: selectedMajors.filter((item) => item !== value) });
    else if (key === 'years') updateParams({ years: selectedYears.filter((item) => item !== value) });
    else if (key === 'levels') updateParams({ levels: selectedLevels.filter((item) => item !== value) });
    else if (key === 'interests') updateParams({ interests: preferences.filter((item) => item !== value) });
    else if (key === 'graduationYears') updateParams({ graduationYears: graduationYears.filter((item) => item !== value) });
    else if (key === 'intakeYears') updateParams({ intakeYears: intakeYears.filter((item) => item !== value) });
    else if (key === 'languages') updateParams({ languages: languages.filter((item) => item !== value) });
    else if (key === 'location') updateParams({ location: null });
    else if (key === 'openToMessages') updateParams({ openToMessages: null });
    else if (key === 'openToMentoring') updateParams({ openToMentoring: null });
    else if (key === 'verified') updateParams({ verified: null });
  };

  const getPersonStudyLabel = (person: PeoplePerson) => {
    if (person.role === 'prospective') return 'Prospective';
    if (person.role === 'faculty') return [person.title, person.department].filter(Boolean).join(' · ') || 'Faculty';
    if (person.graduatedYear) return `Graduated ${person.graduatedYear}`;
    if (person.year) return person.programmeDurationYears
      ? `Year ${person.year}/${person.programmeDurationYears}`
      : `Year ${person.year}`;
    return 'Study year hidden';
  };

  const hasPeopleFilters = selectedRoles.length + selectedUniversities.length + selectedMajors.length + selectedYears.length + selectedLevels.length + preferences.length +
    graduationYears.length + intakeYears.length + languages.length + Number(Boolean(locationFilter)) + Number(extraFilters.openToMessages) + Number(extraFilters.openToMentoring) + Number(extraFilters.verifiedOnly) > 0;
  const roleFilterOptions = selectedRoles.map((role) => ({
    key: 'roles',
    id: role === 'scholar' ? 'student' : role,
    label: connectionRoles[role].label,
  }));
  const selectedFilterChips = [
    ...roleFilterOptions,
    ...selectedUniversities.map((id) => ({ key: 'universities', id, label: universities.find((name) => peopleOptionId(name) === id) ?? id })),
    ...selectedMajors.map((id) => ({ key: 'majors', id, label: majors.find((name) => peopleOptionId(name) === id) ?? id })),
    ...selectedYears.map((id) => ({ key: 'years', id, label: yearOptions.find((option) => option.id === id)?.label ?? id })),
    ...selectedLevels.map((id) => ({ key: 'levels', id, label: degreeLevelOptions.find((option) => option.id === id)?.label ?? id })),
    ...preferences.map((id) => ({ key: 'interests', id, label: id })),
    ...graduationYears.map((id) => ({ key: 'graduationYears', id, label: `Graduation ${id}` })),
    ...intakeYears.map((id) => ({ key: 'intakeYears', id, label: `Intake ${id}` })),
    ...languages.map((id) => ({ key: 'languages', id, label: id })),
    ...(locationFilter ? [{ key: 'location', id: locationFilter, label: `Location: ${locationFilter}` }] : []),
    ...(extraFilters.openToMessages ? [{ key: 'openToMessages', id: 'true', label: 'Open to messages' }] : []),
    ...(extraFilters.openToMentoring ? [{ key: 'openToMentoring', id: 'true', label: 'Open to mentoring' }] : []),
    ...(extraFilters.verifiedOnly ? [{ key: 'verified', id: 'true', label: 'Verified only' }] : []),
  ];
  const toggleParamList = (key: string, selected: string[], value: string) => {
    updateParams({ [key]: selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value] });
  };
  const toggleRole = (role: ConnectionRole) => {
    const value = role === 'scholar' ? 'student' : role;
    const nextRoles = selectedRoleParams.includes(value)
      ? selectedRoleParams.filter((selected) => selected !== value)
      : [...selectedRoleParams, value];
    updateParams({
      roles: nextRoles,
      ...(!nextRoles.length || nextRoles.includes('student') ? {} : { years: [], levels: [] }),
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-32">
      <header>
        <p className="eyebrow text-secondary">Your academic network</p>
        <h1 className="mt-1 font-headline text-3xl font-semibold text-primary">
          {university ? `Connect with ${university.shortName} Students & Alumni` : 'Make Connections'}
        </h1>
        <p className="mt-2 max-w-2xl text-on-surface-variant">
          {university
            ? `Browse students and mentors affiliated with ${university.name}. Choose topics to find people with shared interests.`
            : 'Choose the topics you care about to find students and mentors with shared interests. Recommendations update as you change your preferences.'}
        </p>
      </header>

      {user && (!user.university || !user.major || (user.role === 'scholar' && (!user.enrollmentYear || !user.programmeDurationYears))) && (
        <aside className="flex flex-col gap-3 rounded-xl border border-secondary/20 bg-secondary-fixed/50 p-4 sm:flex-row sm:items-center sm:justify-between" role="status">
          <div>
            <p className="font-semibold text-primary">Add your university and major to appear in search</p>
            <p className="mt-1 text-sm text-on-surface-variant">Complete your study details and choose whether your profile is discoverable.</p>
          </div>
          <Link to="/profile?edit=true" className="btn-primary shrink-0">Edit profile</Link>
        </aside>
      )}

      <section className="card p-5 sm:p-6" aria-labelledby="roles-heading">
        <div className="text-center">
          <h2 id="roles-heading" className="font-semibold text-primary">Connect with</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Choose one or more roles to filter people. Leave them unselected to see everyone.</p>
        </div>
        <div role="group" aria-label="Filter by role" className="mx-auto mt-4 grid max-w-[640px] grid-cols-1 gap-2 sm:grid-cols-3">
          {connectionRoleIds.map((id) => {
            const { label, icon } = connectionRoles[id];
            const selected = selectedRoles.includes(id);
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleRole(id)}
                className={cx(
                  'flex min-h-[4.5rem] items-center justify-center gap-2 rounded-xl border p-3 text-sm font-semibold transition',
                  selected
                    ? 'border-secondary bg-secondary-fixed text-secondary'
                    : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
                )}
              >
                <Icon name={icon} />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="find-students-heading">
        <div className="text-center">
          <h2 id="find-students-heading" className="font-semibold text-primary">Find by university and major</h2>
          <p className="mt-1 text-sm text-on-surface-variant">Narrow your search to people studying what and where you care about.</p>
        </div>
        <button
          ref={mobileFilterTrigger}
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="btn-outline mt-4 w-full md:hidden"
          aria-haspopup="dialog"
          aria-expanded={mobileFiltersOpen}
          aria-controls="mobile-people-filters"
        >
          <Icon name="tune" /> Filters
          {peopleResults && <span className="ml-auto">{peopleResults.total} results</span>}
        </button>
        <div
          ref={mobileFilterPanel}
          id="mobile-people-filters"
          className={cx(
            mobileFiltersOpen
              ? 'fixed inset-0 z-[70] block overflow-y-auto bg-white p-5 pb-24 md:static md:z-auto md:overflow-visible md:bg-transparent md:p-0'
              : 'hidden md:block',
          )}
          role={mobileFiltersOpen ? 'dialog' : undefined}
          aria-modal={mobileFiltersOpen ? 'true' : undefined}
          aria-label={mobileFiltersOpen ? 'Find students filters' : undefined}
        >
          {mobileFiltersOpen && (
            <div className="mb-5 flex items-center justify-between border-b border-outline-variant/50 pb-3 md:hidden">
              <h3 className="font-headline text-xl font-semibold text-primary">Find students</h3>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="Close filters" className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-low">
                <Icon name="close" />
              </button>
            </div>
          )}
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {configuredPeopleFilters.map((config) => (
              <PeopleFilterSelect
                key={config.id}
                label={config.label}
                placeholder={config.placeholder}
                options={config.options}
                selected={config.selected}
                searchable={config.searchable}
                hierarchical={config.hierarchical}
                onToggle={(value) => toggleParamList(config.id, config.selected, value)}
              />
            ))}
            <div>
              <span className="mb-1.5 block text-sm font-semibold text-primary">Year of study</span>
              <div role="group" aria-label="Filter by year of study" className="flex min-h-11 flex-wrap gap-1.5">
                {yearOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={studentYearDisabled}
                    aria-pressed={selectedYears.includes(option.id)}
                    onClick={() => toggleParamList('years', selectedYears, option.id)}
                    className={cx(
                      'rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-45',
                      selectedYears.includes(option.id) ? 'border-secondary bg-secondary-fixed text-secondary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
                    )}
                  >
                    {option.label}{peopleResults?.facets.years.find((facet) => facet.id === option.id)?.count !== undefined && (
                      <span className="ml-1 text-[10px] opacity-75">{peopleResults.facets.years.find((facet) => facet.id === option.id)?.count}</span>
                    )}
                  </button>
                ))}
              </div>
              <div role="group" aria-label="Filter by degree level" className="mt-2 flex flex-wrap gap-1.5">
                {degreeLevelOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    disabled={studentYearDisabled}
                    aria-pressed={selectedLevels.includes(option.id)}
                    onClick={() => toggleParamList('levels', selectedLevels, option.id)}
                    className={cx(
                      'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-45',
                      selectedLevels.includes(option.id) ? 'border-secondary bg-secondary-fixed text-secondary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {studentYearDisabled && <p className="mt-1 text-xs text-on-surface-variant">Study year is available when students are included.</p>}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="block text-sm font-semibold text-primary">
              Search people
              <span className="relative mt-1.5 block">
                <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 !text-[18px] text-on-surface-variant" />
                <input
                  type="search"
                  maxLength={100}
                  value={peopleQuery}
                  onChange={(event) => {
                    const value = event.target.value.slice(0, 100);
                    setPeopleQuery(value);
                    updateParams({ q: value }, true);
                  }}
                  placeholder="Name, university, or major"
                  className="input !py-2 pl-9 text-sm"
                />
              </span>
            </label>
            <label className="block text-sm font-semibold text-primary">
              Sort
              <select value={sort} onChange={(event) => updateParams({ sort: event.target.value })} className="input mt-1.5 !py-2 text-sm">
                {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-3">
            <button
              type="button"
              aria-expanded={moreFiltersOpen}
              aria-controls="more-people-filters"
              onClick={() => setMoreFiltersOpen((open) => !open)}
              className="text-sm font-semibold text-secondary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary"
            >
              <Icon name={moreFiltersOpen ? 'expand_less' : 'expand_more'} className="mr-1" />
              More filters
            </button>
            {moreFiltersOpen && (
              <div id="more-people-filters" className="mt-3 grid gap-3 rounded-xl bg-surface-container-low/60 p-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-primary">Country or city
                  <input value={locationFilter} maxLength={100} onChange={(event) => {
                    const value = event.target.value.slice(0, 100);
                    setLocationFilter(value);
                    updateParams({ location: value }, true);
                  }} className="input mt-1.5" placeholder="Search a location" />
                </label>
                <fieldset>
                  <legend className="text-sm font-semibold text-primary">Graduation year</legend>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {Array.from({ length: 14 }, (_, index) => String(new Date().getFullYear() - 6 + index)).map((year) => (
                      <button key={year} type="button" aria-pressed={graduationYears.includes(year)} onClick={() => toggleParamList('graduationYears', graduationYears, year)} className={cx('rounded-full border px-2.5 py-1 text-xs font-medium', graduationYears.includes(year) ? 'border-secondary bg-secondary-fixed text-secondary' : 'border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low')}>{year}</button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-sm font-semibold text-primary">Intake year</legend>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {Array.from({ length: 14 }, (_, index) => String(new Date().getFullYear() - 6 + index)).map((year) => (
                      <button key={year} type="button" aria-pressed={intakeYears.includes(year)} onClick={() => toggleParamList('intakeYears', intakeYears, year)} className={cx('rounded-full border px-2.5 py-1 text-xs font-medium', intakeYears.includes(year) ? 'border-secondary bg-secondary-fixed text-secondary' : 'border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low')}>{year}</button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="text-sm font-semibold text-primary">Languages spoken</legend>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {languageOptions.map((language) => (
                      <button key={language} type="button" aria-pressed={languages.includes(language)} onClick={() => toggleParamList('languages', languages, language)} className={cx('rounded-full border px-2.5 py-1 text-xs font-medium', languages.includes(language) ? 'border-secondary bg-secondary-fixed text-secondary' : 'border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low')}>{language}</button>
                    ))}
                  </div>
                </fieldset>
                <div className="flex flex-col gap-2 text-sm sm:pt-1">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={extraFilters.openToMessages} onChange={(event) => updateParams({ openToMessages: event.target.checked ? 'true' : null })} className="accent-secondary" />Open to messages</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={extraFilters.openToMentoring} onChange={(event) => updateParams({ openToMentoring: event.target.checked ? 'true' : null })} className="accent-secondary" />Open to mentoring</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={extraFilters.verifiedOnly} onChange={(event) => updateParams({ verified: event.target.checked ? 'true' : null })} className="accent-secondary" />Verified accounts only</label>
                </div>
              </div>
            )}
          </div>
          {hasPeopleFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Selected filters">
              {selectedFilterChips.map((chip) => (
                <button key={`${chip.key}-${chip.id}`} type="button" onClick={() => removeFilter(chip.key, chip.id)} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-white px-3 py-1.5 text-xs font-medium text-on-surface hover:border-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary">
                  {chip.label}<Icon name="close" className="!text-[15px]" />
                </button>
              ))}
              <button type="button" onClick={clearAll} className="text-xs font-semibold text-secondary underline">Clear all</button>
            </div>
          )}
          <p className="mt-4 text-sm font-semibold text-primary" aria-live="polite" aria-atomic="true">
            {peopleLoading ? 'Updating people…' : `${peopleResults?.total ?? 0} ${peopleResults?.total === 1 ? 'person matches' : 'people match'}`}
          </p>
          <div className="fixed inset-x-0 bottom-0 z-[71] flex gap-3 border-t border-outline-variant bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:hidden">
            <button type="button" onClick={clearAll} className="btn-outline flex-1">Clear all</button>
            <button type="button" onClick={() => setMobileFiltersOpen(false)} className="btn-primary flex-1">Apply ({peopleLoading ? '…' : peopleResults?.total ?? 0} results)</button>
          </div>
        </div>
      </section>

      <section className="card p-5 sm:p-6" aria-labelledby="interests-heading">
        <div className="grid items-center gap-3 text-center sm:grid-cols-3">
          <div className="sm:col-start-2">
            <h2 id="interests-heading" className="font-semibold text-primary">Your interests</h2>
            <p className="mt-1 text-sm text-on-surface-variant">Select one or more topics to personalize your list.</p>
          </div>
          <label className="relative sm:col-start-3 sm:row-start-1 sm:justify-self-end">
            <span className="sr-only">Search interests</span>
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 !text-[18px] text-on-surface-variant" />
            <input
              type="search"
              value={interestSearch}
              onChange={(event) => {
                setInterestSearch(event.target.value);
                setVisibleInterestCount(interestsPerPage);
              }}
              placeholder="Search interests"
              className="input !py-2 pl-9 text-sm sm:w-56"
            />
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {visibleInterests.map((interest) => {
            const selected = preferences.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                aria-pressed={selected}
                onClick={() => togglePreference(interest)}
                className={cx(
                  'flex min-h-10 w-full items-center justify-center rounded-full border px-3 py-1.5 text-center text-sm font-medium transition',
                  selected
                    ? 'border-secondary bg-secondary-fixed text-secondary'
                    : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
                )}
              >
                <span aria-hidden="true">{interestEmojis[interest] ?? defaultInterestEmoji}</span>
                {interest}
              </button>
            );
          })}
        </div>
        {!filteredInterests.length && (
          <p className="mt-4 text-center text-sm text-on-surface-variant">No interests match “{interestSearch}”.</p>
        )}
        <div className="mt-4 grid grid-cols-3 items-center">
          <span />
          {visibleInterestCount < filteredInterests.length ? (
            <button
              type="button"
              className="text-center text-sm font-semibold text-secondary hover:underline"
              onClick={() => setVisibleInterestCount((count) => count + interestsPerPage)}
            >
              <Icon name="keyboard_arrow_down" className="align-middle" />
              Show more interests
            </button>
          ) : <span />}
          <button type="button" className="text-right text-sm font-semibold text-secondary hover:underline" onClick={() => updateParams({ interests: [] })}>
            Clear preferences
          </button>
        </div>
      </section>

      <section aria-labelledby="students-results-heading" className="scroll-mt-24">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="students-results-heading" className="font-headline text-xl font-semibold text-primary">People matching your filters</h2>
            <p className="mt-1 text-sm text-on-surface-variant" aria-live="polite">
              {peopleLoading ? 'Searching people…' : `${peopleResults?.total ?? 0} ${peopleResults?.total === 1 ? 'person' : 'people'} match`}
            </p>
          </div>
        </div>
        {peopleError && <p role="alert" className="mb-3 rounded-lg bg-error-container px-4 py-3 text-sm text-on-error-container">{peopleError}</p>}
        {peopleLoading ? (
          <div className="grid gap-3 sm:grid-cols-2" aria-label="Loading people" role="status">
            {[0, 1, 2, 3].map((item) => <div key={item} className="card flex animate-pulse gap-3 p-5"><div className="h-14 w-14 rounded-full bg-surface-container" /><div className="flex-1 space-y-3"><div className="h-4 w-2/3 rounded bg-surface-container" /><div className="h-3 w-1/2 rounded bg-surface-container" /><div className="h-8 w-full rounded bg-surface-container" /></div></div>)}
          </div>
        ) : peopleResults?.items.length ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {peopleResults.items.map((person) => {
                const role = person.role === 'student' ? 'scholar' : person.role;
                const sameUniversity = Boolean(user && (user.universityId ?? (user.university ? peopleOptionId(user.university) : '')) === person.universityId);
                const sameMajor = Boolean(user && (user.majorId ?? (user.major ? peopleOptionId(user.major) : '')) === person.majorId);
                const subtitle = [person.major, person.universityShortName].filter(Boolean).join(' · ');
                return (
                  <article key={person.id} className="card flex min-w-0 flex-col gap-3 p-4 sm:p-5">
                    <div className="flex min-w-0 items-start gap-3">
                      <UserAvatar
                        src={person.avatar || undefined}
                        name={person.name}
                        size={52}
                        profileHref={`/people/${person.id}`}
                        showName
                        nameClassName="text-sm"
                        subtitle={undefined}
                        disableProfilePreview
                        className="min-w-0 flex-1"
                      />
                      <Tag tone={person.verified ? 'green' : 'neutral'}>{connectionRoles[role].label}</Tag>
                    </div>
                    <div className="min-h-[4.5rem] space-y-1 text-sm text-on-surface-variant">
                      {person.university && (
                        <p title={person.university}>
                          <Icon name="account_balance" className="mr-1 !text-[16px]" />
                          <span className="font-medium text-on-surface">{person.universityShortName}</span>
                          <span className="sr-only">, {person.university}</span>
                        </p>
                      )}
                      {person.major && <p><Icon name="school" className="mr-1 !text-[16px]" />{person.major}</p>}
                      <p><Icon name={person.role === 'faculty' ? 'work' : 'calendar_month'} className="mr-1 !text-[16px]" />{getPersonStudyLabel(person)}</p>
                    </div>
                    {(sameUniversity || sameMajor || person.sharedInterests.length > 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {sameUniversity && <Tag tone="blue">Same university</Tag>}
                        {sameMajor && <Tag tone="blue">Same major</Tag>}
                        {person.sharedInterests.length > 0 && <Tag tone="blue">{person.sharedInterests.length} shared {person.sharedInterests.length === 1 ? 'interest' : 'interests'}</Tag>}
                      </div>
                    )}
                    <div className="mt-auto flex gap-2 border-t border-outline-variant/50 pt-3">
                      <button
                        type="button"
                        disabled={requested.includes(person.id)}
                        onClick={() => requestConnection(person.id, person.name)}
                        className={requested.includes(person.id) ? 'btn-outline flex-1 !text-on-surface-variant' : 'btn-primary flex-1'}
                      >
                        <Icon name={requested.includes(person.id) ? 'check' : 'person_add'} />
                        {requested.includes(person.id) ? 'Request sent' : 'Connect'}
                      </button>
                      <button
                        type="button"
                        disabled={person.id === user?.id}
                        onClick={() => openMiniChatForPerson({ id: person.id, name: person.name, subtitle, avatar: person.avatar })}
                        className="btn-outline flex-1"
                      >
                        <Icon name="mail" /> Message
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            {peopleResults.nextCursor && (
              <div className="mt-4 text-center">
                <button type="button" disabled={peopleLoadingMore} onClick={() => void loadMorePeople()} className="btn-outline">
                  {peopleLoadingMore ? 'Loading…' : 'Load more people'}
                </button>
              </div>
            )}
          </>
        ) : !peopleLoading && (
          <div className="card p-8 text-center">
            <Icon name="person_search" className="text-secondary" />
            <p className="mt-2 font-semibold text-primary">No students match these filters</p>
            <p className="mt-1 text-sm text-on-surface-variant">Try removing one filter to broaden your search.</p>
            <button type="button" onClick={clearAll} className="btn-primary mt-4">Clear filters</button>
          </div>
        )}
      </section>

      <section aria-labelledby="recommendations-heading">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="recommendations-heading" className="font-headline text-xl font-semibold text-primary">
              People you may like to meet
            </h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              {recommendations.length} {recommendations.length === 1 ? 'recommendation' : 'recommendations'}
              {preferences.length ? ' matching your interests' : ' across the community'}
            </p>
          </div>
        </div>
        {recommendations.length ? (
          <div className="space-y-3">
            {recommendations.map(({ college, mentor }) => {
              const sharedInterests = mentor.tags.filter((tag) => preferences.includes(tag));
              const hasRequested = requested.includes(mentor.id);
              return (
                <article key={mentor.id} className="card p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <Avatar src={mentor.avatar} name={mentor.name} size={56} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-primary">{mentor.name}</h3>
                        <Tag tone="green">{connectionRoles[mentor.role].label}</Tag>
                      </div>
                      <p className="mt-1 text-sm text-on-surface-variant">{mentor.program}</p>
                      <p className="text-sm text-on-surface-variant">{college.name}</p>
                      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{mentor.quote}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(sharedInterests.length ? sharedInterests : mentor.tags).map((tag) => (
                          <Tag key={tag} tone={sharedInterests.includes(tag) ? 'blue' : 'neutral'}>{tag}</Tag>
                        ))}
                      </div>
                      <p className="mt-3 flex items-center gap-1 text-xs text-on-surface-variant">
                        <Icon name="star" fill className="!text-[15px] text-gold" />
                        {mentor.rating.toFixed(1)} · {mentor.reviews} reviews
                        <span className="mx-1">·</span>
                        Usually responds {mentor.responseTime}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2 sm:flex-col">
                      <button
                        type="button"
                        disabled={hasRequested}
                        onClick={() => requestConnection(mentor.id, mentor.name)}
                        className={hasRequested ? 'btn-outline !text-on-surface-variant' : 'btn-primary'}
                      >
                        <Icon name={hasRequested ? 'check' : 'person_add'} />
                        {hasRequested ? 'Request sent' : 'Connect'}
                      </button>
                      <Link to={`/colleges/${college.id}`} className="btn-ghost justify-center">
                        View college
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <Icon name="person_search" className="text-secondary" />
            <p className="mt-2 font-semibold text-primary">No matches for those filters yet</p>
            <p className="mt-1 text-sm text-on-surface-variant">Try selecting different roles or topics, or clear your preferences to browse everyone.</p>
          </div>
        )}
      </section>
    </div>
  );
}
