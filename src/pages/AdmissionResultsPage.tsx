import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { Icon } from '../components/ui';
import {
  isAdmissionPredictionRequest,
  predictAdmission,
  type AdmissionPredictionRequest,
  type AdmissionPredictionResult,
} from '../data/admission';

type SortOrder = 'probability-desc' | 'university' | 'profession';

function titleForRequest(request: AdmissionPredictionRequest) {
  if (request.university && request.profession) return `${request.profession} at ${request.university}`;
  if (request.university) return `Programmes at ${request.university}`;
  if (request.profession) return `${request.profession} across universities`;
  return 'Your university possibilities';
}

export default function AdmissionResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState: unknown = location.state;
  const stateRequest = locationState && typeof locationState === 'object' && 'request' in locationState
    ? locationState.request
    : undefined;
  const request = isAdmissionPredictionRequest(stateRequest) ? stateRequest : null;
  const [result, setResult] = useState<AdmissionPredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('probability-desc');

  useEffect(() => {
    if (!request) return;
    let active = true;
    setLoading(true);
    setError('');
    setResult(null);
    predictAdmission(request)
      .then((prediction) => {
        if (active) setResult(prediction);
      })
      .catch(() => {
        if (active) setError('We could not load admission comparisons. Please try again later.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [request]);

  const programs = useMemo(() => {
    const filtered = (result?.programs ?? []).filter((program) =>
      (!request?.university || program.university === request.university)
      && (!request?.profession || program.profession === request.profession)
      && `${program.university} ${program.profession}`.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase()),
    );
    return [...filtered].sort((first, second) => {
      if (sortOrder === 'university') return first.university.localeCompare(second.university);
      if (sortOrder === 'profession') return first.profession.localeCompare(second.profession);
      return (second.estimatedProbability ?? -1) - (first.estimatedProbability ?? -1);
    });
  }, [filter, request, result, sortOrder]);

  const returnToCalculator = () => {
    navigate('/colleges', { state: request ? { admissionCalculatorRequest: request } : null });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow text-secondary">Admission planner</p>
          <h1 className="mt-1 font-headline text-3xl font-semibold text-primary">University admission results</h1>
          <p className="mt-2 max-w-3xl text-on-surface-variant">
            {request ? titleForRequest(request) : 'Your submitted examination details and comparisons will appear here.'}
          </p>
        </div>
        <button type="button" onClick={returnToCalculator} className="btn-outline shrink-0">
          <Icon name="arrow_back" /> Adjust scores
        </button>
      </header>

      {request ? (
        <>
          <section className="card p-5 sm:p-6" aria-labelledby="score-summary-heading">
            <h2 id="score-summary-heading" className="font-semibold text-primary">Your examination summary</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <SummaryTile label="Profession group" value={request.professionGroup} />
              <SummaryTile label="Graduation exam" value={`${request.graduationExamScore} / 300`} />
              <SummaryTile label="Admission exam" value={`${request.admissionExamScore} / 400`} />
            </div>
            {(request.university || request.profession) && (
              <p className="mt-4 text-sm text-on-surface-variant">
                {[
                  request.university && `University: ${request.university}`,
                  request.profession && `Profession: ${request.profession}`,
                ].filter(Boolean).join(' · ')}
              </p>
            )}
          </section>

          <section className="space-y-4" aria-labelledby="programme-results-heading">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="programme-results-heading" className="font-headline text-xl font-semibold text-primary">
                  {titleForRequest(request)}
                </h2>
                <p className="mt-1 text-sm text-on-surface-variant">Comparisons are based on verified admissions data when connected.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <label>
                  <span className="sr-only">Filter programmes</span>
                  <input
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder="Filter results"
                    className="input !py-2 text-sm"
                  />
                </label>
                <label>
                  <span className="sr-only">Sort programmes</span>
                  <select
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                    className="input !py-2 text-sm"
                  >
                    <option value="probability-desc">Sort by chance</option>
                    <option value="university">Sort by university</option>
                    <option value="profession">Sort by profession</option>
                  </select>
                </label>
              </div>
            </div>

            {loading ? (
              <div role="status" className="card p-8 text-center text-sm text-on-surface-variant">
                <Icon name="progress_activity" className="animate-spin text-secondary" />
                <p className="mt-2">Loading admission comparisons…</p>
              </div>
            ) : error ? (
              <div role="alert" className="card p-6 text-center text-sm text-error">{error}</div>
            ) : programs.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {programs.map((program) => (
                  <article key={`${program.university}-${program.profession}`} className="card p-5">
                    <p className="text-sm font-semibold text-primary">{program.profession}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-on-surface-variant">
                      <Icon name="account_balance" className="!text-[17px]" />{program.university}
                    </p>
                    {typeof program.estimatedProbability === 'number'
                      && Number.isFinite(program.estimatedProbability)
                      && program.estimatedProbability >= 0
                      && program.estimatedProbability <= 100 && (
                      <p className="mt-4 text-2xl font-bold text-secondary">{program.estimatedProbability}% <span className="text-sm font-medium">estimated chance</span></p>
                    )}
                    {program.historicalAdmissionScore
                      && Number.isInteger(program.historicalAdmissionScore.year)
                      && program.historicalAdmissionScore.score >= 0 && (
                      <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-sm text-on-surface-variant">
                        Historical admission score ({program.historicalAdmissionScore.year}): <strong className="text-primary">{program.historicalAdmissionScore.score}</strong>
                      </p>
                    )}
                    {!(typeof program.estimatedProbability === 'number'
                      && Number.isFinite(program.estimatedProbability)
                      && program.estimatedProbability >= 0
                      && program.estimatedProbability <= 100)
                      && !(program.historicalAdmissionScore
                        && Number.isInteger(program.historicalAdmissionScore.year)
                        && program.historicalAdmissionScore.score >= 0) && (
                      <p className="mt-3 text-sm text-on-surface-variant">No admission score information is available.</p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="card p-6 sm:p-8">
                <div className="mx-auto max-w-2xl text-center">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-fixed text-secondary">
                    <Icon name="query_stats" />
                  </span>
                  <h3 className="mt-4 font-semibold text-primary">
                    {result ? 'No matching programmes found' : 'Admission predictions are not connected yet'}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                    {result
                      ? 'Try adjusting your search or exam selections.'
                      : 'Your scores are ready, but reliable admission probabilities and historical cutoffs will appear once the prediction algorithm and verified admissions data are integrated. No chance estimates are shown until then.'}
                  </p>
                  {!result && <p className="mt-3 text-xs text-on-surface-variant">No estimates or admission thresholds have been fabricated.</p>}
                </div>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="card p-8 text-center">
          <h2 className="font-semibold text-primary">Calculator details unavailable</h2>
          <p className="mt-2 text-sm text-on-surface-variant">Return to the university page to enter your profession group and exam scores.</p>
          <button type="button" onClick={returnToCalculator} className="btn-primary mt-4">Open calculator <Icon name="arrow_forward" /></button>
        </section>
      )}
    </div>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-container-low p-4">
      <p className="text-xs font-medium text-on-surface-variant">{label}</p>
      <p className="mt-1 font-semibold text-primary">{value}</p>
    </div>
  );
}
