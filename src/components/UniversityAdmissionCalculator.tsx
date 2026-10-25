import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { Icon, Modal, cx } from './ui';
import SearchableSelect from './SearchableSelect';
import { majors, universities } from '../data/educationOptions';
import {
  admissionRules,
  calculateSubjectTotal,
  getAdmissionRule,
  getAdmissionSubjects,
  professionGroups,
  type AdmissionPredictionRequest,
  type AdmissionSubgroup,
  type ExaminationLanguage,
  type ExamSection,
  type ProfessionGroup,
  type ProfessionGroupRule,
  type SubjectRule,
} from '../data/admission';

type SubjectScores = Record<string, string>;

interface UniversityAdmissionCalculatorProps {
  open: boolean;
  onClose: () => void;
  initialRequest?: AdmissionPredictionRequest;
}

const isValidScore = (value: string, maximum: number) =>
  /^\d+$/.test(value) && Number(value) <= maximum;

function labelsForSubjects(subjects: SubjectRule[], language: ExaminationLanguage) {
  return subjects.map((subject) => ({ ...subject, name: subject.label(language) }));
}

function scoresForApplicableSubjects(scores: SubjectScores, subjects: SubjectRule[]) {
  const applicableIds = new Set([
    ...admissionRules.graduationSubjects.map(({ id }) => id),
    ...subjects.map(({ id }) => id),
  ]);
  return Object.fromEntries(Object.entries(scores).filter(([id]) => applicableIds.has(id)));
}

export default function UniversityAdmissionCalculator({
  open,
  onClose,
  initialRequest,
}: UniversityAdmissionCalculatorProps) {
  const navigate = useNavigate();
  const [professionGroup, setProfessionGroup] = useState<ProfessionGroup | ''>(initialRequest?.professionGroup ?? '');
  const [subgroup, setSubgroup] = useState<AdmissionSubgroup | ''>(initialRequest?.subgroup ?? '');
  const [examinationLanguage, setExaminationLanguage] = useState<ExaminationLanguage>(initialRequest?.examinationLanguage ?? 'az');
  const [university, setUniversity] = useState(initialRequest?.university ?? '');
  const [profession, setProfession] = useState(initialRequest?.profession ?? '');
  const [graduationScore, setGraduationScore] = useState(initialRequest ? String(initialRequest.graduationExamScore) : '');
  const [admissionScore, setAdmissionScore] = useState(initialRequest ? String(initialRequest.admissionExamScore) : '');
  const [showSubjectScores, setShowSubjectScores] = useState(false);
  const [subjectScores, setSubjectScores] = useState<SubjectScores>(() => Object.fromEntries([
    ...initialRequest?.subjectScores.graduation.map(({ id, score }) => [id, String(score)] as const) ?? [],
    ...initialRequest?.subjectScores.admission.map(({ id, score }) => [id, String(score)] as const) ?? [],
  ]));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const graduationSubjects = useMemo(
    () => labelsForSubjects(admissionRules.graduationSubjects, examinationLanguage),
    [examinationLanguage],
  );
  const admissionSubjects = professionGroup
    ? labelsForSubjects(getAdmissionSubjects(professionGroup, subgroup || undefined, examinationLanguage), examinationLanguage)
    : [];
  const groupRule: ProfessionGroupRule | null = professionGroup ? getAdmissionRule(professionGroup) : null;
  const graduationCalculated = showSubjectScores
    ? calculateSubjectTotal(subjectScores, graduationSubjects)
    : null;
  const admissionCalculated = showSubjectScores
    ? professionGroup === 'Group V' ? 0 : calculateSubjectTotal(subjectScores, admissionSubjects)
    : null;
  const displayedGraduationScore = graduationCalculated === null ? (showSubjectScores ? '' : graduationScore) : String(graduationCalculated);
  const displayedAdmissionScore = professionGroup === 'Group V'
    ? '0'
    : admissionCalculated === null ? (showSubjectScores ? '' : admissionScore) : String(admissionCalculated);

  const changeProfessionGroup = (group: ProfessionGroup) => {
    const rule = getAdmissionRule(group);
    const nextSubgroup = rule.subgroups[0]?.id;
    const nextSubjects = getAdmissionSubjects(group, nextSubgroup, examinationLanguage);
    setProfessionGroup(group);
    setSubgroup(nextSubgroup ?? '');
    setSubjectScores((current) => scoresForApplicableSubjects(current, nextSubjects));
    setAdmissionScore(group === 'Group V' ? '0' : '');
    setErrors({});
  };

  const changeSubgroup = (nextSubgroup: AdmissionSubgroup) => {
    if (!professionGroup) return;
    const nextSubjects = getAdmissionSubjects(professionGroup, nextSubgroup, examinationLanguage);
    setSubgroup(nextSubgroup);
    setSubjectScores((current) => scoresForApplicableSubjects(current, nextSubjects));
    setErrors((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => !key.startsWith('admission-')),
    ));
  };

  const changeLanguage = (language: ExaminationLanguage) => {
    if (language === examinationLanguage) return;
    setExaminationLanguage(language);
    setSubjectScores((current) => {
      const next = { ...current };
      delete next.language;
      return next;
    });
    setErrors((current) => Object.fromEntries(
      Object.entries(current).filter(([key]) => key !== 'graduation-language' && key !== 'admission-language'),
    ));
  };

  const setScore = (value: string, update: (next: string) => void, field: string) => {
    if (/^\d*$/.test(value)) {
      update(value);
      setErrors((current) => ({ ...current, [field]: '' }));
    }
  };

  const updateSubjectScore = (section: ExamSection, subject: SubjectRule, value: string) => {
    setScore(value, (score) => setSubjectScores((current) => ({ ...current, [subject.id]: score })), `${section}-${subject.id}`);
  };

  const checkChances = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!professionGroup) nextErrors.professionGroup = 'Select your profession group.';
    if (subgroup === '' && groupRule?.subgroups.length) nextErrors.subgroup = 'Select a subgroup.';

    if (showSubjectScores) {
      for (const subject of graduationSubjects) {
        if (!isValidScore(subjectScores[subject.id] ?? '', subject.maximum)) {
          nextErrors[`graduation-${subject.id}`] = `Enter a whole number from 0 to ${subject.maximum}.`;
        }
      }
      for (const subject of admissionSubjects) {
        if (!isValidScore(subjectScores[subject.id] ?? '', subject.maximum)) {
          nextErrors[`admission-${subject.id}`] = `Enter a whole number from 0 to ${subject.maximum}.`;
        }
      }
    } else {
      if (!isValidScore(graduationScore, admissionRules.graduationMaximum)) {
        nextErrors.graduationScore = `Enter a whole number from 0 to ${admissionRules.graduationMaximum}.`;
      }
      if (professionGroup !== 'Group V' && !isValidScore(admissionScore, admissionRules.admissionMaximum)) {
        nextErrors.admissionScore = `Enter a whole number from 0 to ${admissionRules.admissionMaximum}.`;
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !professionGroup) return;

    const graduationTotal = showSubjectScores ? graduationCalculated : Number(graduationScore);
    const admissionTotal = professionGroup === 'Group V'
      ? 0
      : showSubjectScores ? admissionCalculated : Number(admissionScore);
    if (graduationTotal === null || admissionTotal === null) return;

    const toSubjectScores = (subjects: SubjectRule[]) => subjects.map((subject) => ({
      id: subject.id,
      subject: subject.label(examinationLanguage),
      score: Number(subjectScores[subject.id]),
      coefficient: subject.coefficient,
    }));

    const request: AdmissionPredictionRequest = {
      professionGroup,
      ...(subgroup ? { subgroup } : {}),
      examinationLanguage,
      ...(university ? { university } : {}),
      ...(profession ? { profession } : {}),
      graduationExamScore: graduationTotal,
      admissionExamScore: admissionTotal,
      subjectScores: {
        graduation: showSubjectScores ? toSubjectScores(graduationSubjects) : [],
        admission: showSubjectScores ? toSubjectScores(admissionSubjects) : [],
      },
    };

    navigate('/admission-results', { state: { request } });
  };

  const groupOptions = groupRule?.subgroups ?? [];

  return (
    <Modal open={open} onClose={onClose} width="max-w-3xl" label="University admission calculator">
      <div className="flex items-start justify-between gap-4 border-b border-outline-variant/50 p-5 sm:p-7">
        <div>
          <p className="eyebrow text-secondary">Admission planner</p>
          <h2 className="mt-1 font-headline text-2xl font-semibold text-primary">Which universities can I get into?</h2>
          <p className="mt-2 text-sm text-on-surface-variant">Enter your exam results and study preferences to prepare an admission estimate.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close calculator" className="btn-ghost !p-2">
          <Icon name="close" />
        </button>
      </div>

      <form onSubmit={checkChances} className="space-y-7 p-5 sm:p-7">
        <section aria-labelledby="profession-group-heading">
          <h3 id="profession-group-heading" className="font-semibold text-primary">A. Select your profession group</h3>
          <p className="mt-1 text-sm text-on-surface-variant">Choose one group from the Azerbaijani university entrance examination.</p>
          <div role="radiogroup" aria-labelledby="profession-group-heading" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {professionGroups.map((group) => {
              const selected = professionGroup === group;
              return (
                <button
                  key={group}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => changeProfessionGroup(group)}
                  className={cx(
                    'rounded-xl border px-3 py-3 text-sm font-semibold transition',
                    selected
                      ? 'border-secondary bg-secondary-fixed text-secondary'
                      : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
                  )}
                >
                  {group}
                </button>
              );
            })}
          </div>
          {errors.professionGroup && <p role="alert" className="mt-2 text-xs text-error">{errors.professionGroup}</p>}
        </section>

        <section aria-labelledby="university-profession-heading">
          <h3 id="university-profession-heading" className="font-semibold text-primary">B. Select a university and profession</h3>
          <p className="mt-1 text-sm text-on-surface-variant">Choose a university, a profession, both, or leave both blank.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <SearchableSelect label="University" value={university} options={universities} optional onChange={setUniversity} />
            <SearchableSelect label="Profession / major" value={profession} options={majors} optional onChange={setProfession} />
          </div>
          <p className="mt-2 text-xs text-on-surface-variant">Group-specific programme availability will be connected when verified admissions data is added.</p>
        </section>

        <section aria-labelledby="exam-scores-heading">
          <h3 id="exam-scores-heading" className="font-semibold text-primary">C. Enter your examination scores</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <ScoreInput
              label="Graduation (Release) Exam Score"
              maximum={admissionRules.graduationMaximum}
              value={displayedGraduationScore}
              error={errors.graduationScore}
              readOnly={showSubjectScores}
              placeholder={showSubjectScores && graduationCalculated === null ? 'Enter all subject scores' : undefined}
              onChange={(value) => setScore(value, setGraduationScore, 'graduationScore')}
            />
            <ScoreInput
              label="University Admission Exam Score"
              maximum={admissionRules.admissionMaximum}
              value={displayedAdmissionScore}
              error={errors.admissionScore}
              readOnly={showSubjectScores || professionGroup === 'Group V'}
              placeholder={professionGroup === 'Group V'
                ? 'Not required for Group V'
                : showSubjectScores && admissionCalculated === null ? 'Enter all subject scores' : undefined}
              onChange={(value) => setScore(value, setAdmissionScore, 'admissionScore')}
            />
          </div>
          {showSubjectScores && (
            <p className="mt-2 text-xs text-on-surface-variant">Totals are calculated from all applicable subject scores using the published DİM subject coefficients.</p>
          )}
        </section>

        <section className="border-t border-outline-variant/50 pt-5">
          <button
            type="button"
            aria-expanded={showSubjectScores}
            onClick={() => setShowSubjectScores((visible) => !visible)}
            className="flex items-center gap-2 text-sm font-semibold text-secondary hover:underline"
          >
            <Icon name={showSubjectScores ? 'expand_less' : 'expand_more'} />
            Enter individual subject scores
          </button>
          {showSubjectScores && (
            <div className="mt-4 space-y-5">
              <div className="rounded-xl bg-surface-container-low/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-primary">Graduation examination</h4>
                    <p className="mt-1 text-xs text-on-surface-variant">First-stage subjects are the same for every profession group; each subject is scored out of 100.</p>
                  </div>
                  <label className="text-xs font-semibold text-primary">
                    Examination language
                    <select
                      value={examinationLanguage}
                      onChange={(event) => changeLanguage(event.target.value as ExaminationLanguage)}
                      className="input mt-1 !py-2 text-sm"
                    >
                      <option value="az">Azerbaijani</option>
                      <option value="ru">Russian</option>
                    </select>
                  </label>
                </div>
                <SubjectFields section="graduation" subjects={graduationSubjects} scores={subjectScores} errors={errors} onChange={updateSubjectScore} />
              </div>

              {professionGroup ? (
                professionGroup === 'Group V' ? (
                  <div className="rounded-xl border border-secondary/20 bg-secondary-fixed/50 p-4">
                    <h4 className="font-semibold text-primary">No second-stage admission examination</h4>
                    <p className="mt-1 text-sm text-on-surface-variant">{groupRule?.admissionNote}</p>
                  </div>
                ) : (
                  <div className="rounded-xl bg-surface-container-low/60 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-primary">Admission examination — {professionGroup}</h4>
                        <p className="mt-1 text-xs text-on-surface-variant">Raw subject scores are out of 100; DİM coefficients are applied when calculating the stage total.</p>
                      </div>
                      {groupOptions.length > 0 && (
                        <fieldset>
                          <legend className="text-xs font-semibold text-primary">Subgroup</legend>
                          <div role="radiogroup" aria-label="Profession subgroup" className="mt-1 flex flex-wrap gap-2">
                            {groupOptions.map((option) => (
                              <button
                                key={option.id}
                                type="button"
                                role="radio"
                                aria-checked={subgroup === option.id}
                                onClick={() => changeSubgroup(option.id)}
                                className={cx(
                                  'rounded-lg border px-3 py-2 text-xs font-semibold transition',
                                  subgroup === option.id
                                    ? 'border-secondary bg-secondary-fixed text-secondary'
                                    : 'border-outline-variant bg-white text-on-surface-variant hover:border-secondary/40',
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </fieldset>
                      )}
                    </div>
                    <SubjectFields section="admission" subjects={admissionSubjects} scores={subjectScores} errors={errors} onChange={updateSubjectScore} />
                  </div>
                )
              ) : (
                <p className="rounded-xl bg-surface-container-low p-4 text-sm text-on-surface-variant">Select a profession group to see its second-stage examination subjects.</p>
              )}

              <p className="text-xs text-on-surface-variant">
                Rules source: <a href={admissionRules.source} target="_blank" rel="noreferrer" className="font-semibold text-secondary underline">State Examination Centre (DİM)</a>
                {' '}· {admissionRules.academicYear} rules checked {admissionRules.verifiedOn}.
              </p>
            </div>
          )}
        </section>

        <div className="border-t border-outline-variant/50 pt-5">
          <button type="submit" className="btn-primary w-full justify-center sm:w-auto">
            Check my chances
            <Icon name="arrow_forward" />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SubjectFields({
  section,
  subjects,
  scores,
  errors,
  onChange,
}: {
  section: ExamSection;
  subjects: (SubjectRule & { name: string })[];
  scores: SubjectScores;
  errors: Record<string, string>;
  onChange: (section: ExamSection, subject: SubjectRule, value: string) => void;
}) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {subjects.map((subject) => {
        const error = errors[`${section}-${subject.id}`];
        return (
          <label key={subject.id} className="block text-xs font-semibold text-primary">
            {subject.name}
            <span className="mt-1 block font-normal text-on-surface-variant">
              Raw score 0–{subject.maximum} · coefficient {subject.coefficient}
              {section === 'admission' ? ` · weighted maximum ${subject.maximum * subject.coefficient}` : ''}
            </span>
            <input
              inputMode="numeric"
              value={scores[subject.id] ?? ''}
              onChange={(event) => onChange(section, subject, event.target.value)}
              placeholder={`0–${subject.maximum}`}
              aria-invalid={Boolean(error)}
              className="input mt-1.5 !py-2 text-sm font-normal"
            />
            {error && <span role="alert" className="mt-1 block text-xs font-medium text-error">{error}</span>}
          </label>
        );
      })}
    </div>
  );
}

function ScoreInput({
  label,
  maximum,
  value,
  error,
  readOnly = false,
  placeholder,
  onChange,
}: {
  label: string;
  maximum: number;
  value: string;
  error?: string;
  readOnly?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold text-primary">
      {label}
      <span className="mt-1 block text-xs font-normal text-on-surface-variant">
        {readOnly && value ? 'Calculated total' : `Score range: 0–${maximum}`}
      </span>
      <input
        inputMode="numeric"
        value={value}
        readOnly={readOnly}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? `0–${maximum}`}
        aria-invalid={Boolean(error)}
        className={cx('input mt-2', readOnly && 'bg-surface-container-low')}
      />
      {error && <span role="alert" className="mt-1 block text-xs font-medium text-error">{error}</span>}
    </label>
  );
}
