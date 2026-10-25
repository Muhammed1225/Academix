export const professionGroups = ['Group I', 'Group II', 'Group III', 'Group IV', 'Group V'] as const;

export type ProfessionGroup = (typeof professionGroups)[number];
export type ExaminationLanguage = 'az' | 'ru';
export type ExamSection = 'graduation' | 'admission';
export type AdmissionSubgroup = 'RK' | 'RI' | 'DT' | 'TC';
export type AdmissionSubjectScore = {
  id: string;
  subject: string;
  score: number;
  coefficient: number;
};

export interface SubjectRule {
  id: string;
  label: (language: ExaminationLanguage) => string;
  maximum: 100;
  coefficient: 1 | 1.5;
}

export interface ProfessionGroupRule {
  group: ProfessionGroup;
  subgroups: { id: AdmissionSubgroup; label: string }[];
  graduationSubjects: SubjectRule[];
  admissionSubjects: (subgroup?: AdmissionSubgroup, language?: ExaminationLanguage) => SubjectRule[];
  admissionNote?: string;
  aptitudeRequirements: never[];
}

const languageSubject: SubjectRule = {
  id: 'language',
  label: (language) => language === 'ru' ? 'Russian language' : 'Azerbaijani language',
  maximum: 100,
  coefficient: 1,
};
const fixedSubject = (id: string, label: string, coefficient: 1 | 1.5 = 1): SubjectRule => ({
  id,
  label: () => label,
  maximum: 100,
  coefficient,
});

export const admissionRules = {
  source: 'https://dim.gov.az/az/fealiyyet/qebul-ve-imtahanlar/bakalavriat',
  verifiedOn: '2026-10-26',
  academicYear: '2026',
  graduationMaximum: 300,
  admissionMaximum: 400,
  graduationSubjects: [
    languageSubject,
    fixedSubject('foreign-language', 'Foreign language'),
    fixedSubject('graduation-mathematics', 'Mathematics'),
  ] satisfies SubjectRule[],
  groups: {
    'Group I': {
      group: 'Group I',
      subgroups: [
        { id: 'RK', label: 'RK — Mathematics & Chemistry' },
        { id: 'RI', label: 'Rİ — Mathematics & Informatics' },
      ],
      graduationSubjects: [] as SubjectRule[],
      admissionSubjects: (subgroup?: AdmissionSubgroup) => [
        fixedSubject('mathematics', 'Mathematics', 1.5),
        fixedSubject('physics', 'Physics', 1.5),
        fixedSubject(subgroup === 'RI' ? 'informatics' : 'chemistry', subgroup === 'RI' ? 'Informatics' : 'Chemistry'),
      ],
      aptitudeRequirements: [],
    },
    'Group II': {
      group: 'Group II',
      subgroups: [],
      graduationSubjects: [] as SubjectRule[],
      admissionSubjects: () => [
        fixedSubject('mathematics', 'Mathematics', 1.5),
        fixedSubject('geography', 'Geography', 1.5),
        fixedSubject('history', 'History'),
      ],
      aptitudeRequirements: [],
    },
    'Group III': {
      group: 'Group III',
      subgroups: [
        { id: 'DT', label: 'DT — Language & History' },
        { id: 'TC', label: 'TC — History & Geography' },
      ],
      graduationSubjects: [] as SubjectRule[],
      admissionSubjects: (subgroup?: AdmissionSubgroup, language: ExaminationLanguage = 'az') => [
        { ...languageSubject, label: () => language === 'ru' ? 'Russian language' : 'Azerbaijani language', coefficient: 1.5 },
        fixedSubject('history', 'History', 1.5),
        fixedSubject(subgroup === 'TC' ? 'geography' : 'literature', subgroup === 'TC' ? 'Geography' : 'Literature'),
      ],
      aptitudeRequirements: [],
    },
    'Group IV': {
      group: 'Group IV',
      subgroups: [],
      graduationSubjects: [] as SubjectRule[],
      admissionSubjects: () => [
        fixedSubject('biology', 'Biology', 1.5),
        fixedSubject('chemistry', 'Chemistry', 1.5),
        fixedSubject('physics', 'Physics'),
      ],
      aptitudeRequirements: [],
    },
    'Group V': {
      group: 'Group V',
      subgroups: [],
      graduationSubjects: [] as SubjectRule[],
      admissionSubjects: () => [],
      admissionNote: 'Group V candidates compete using their first-stage graduation examination results; no second-stage admission examination is required.',
      aptitudeRequirements: [],
    },
  } satisfies Record<ProfessionGroup, ProfessionGroupRule>,
} as const;

export function getAdmissionRule(group: ProfessionGroup): ProfessionGroupRule {
  return admissionRules.groups[group];
}

export function getAdmissionSubjects(
  group: ProfessionGroup,
  subgroup?: AdmissionSubgroup,
  language: ExaminationLanguage = 'az',
) {
  return getAdmissionRule(group).admissionSubjects(subgroup, language);
}

export function calculateSubjectTotal(scores: Record<string, string>, subjects: SubjectRule[]) {
  if (!subjects.length || subjects.some(({ id, maximum }) =>
    !/^\d+$/.test(scores[id] ?? '') || Number(scores[id]) > maximum,
  )) return null;
  return subjects.reduce((total, subject) => total + Number(scores[subject.id]) * subject.coefficient, 0);
}

export interface AdmissionPredictionRequest {
  professionGroup: ProfessionGroup;
  subgroup?: AdmissionSubgroup;
  examinationLanguage: ExaminationLanguage;
  university?: string;
  profession?: string;
  graduationExamScore: number;
  admissionExamScore: number;
  subjectScores: Record<ExamSection, AdmissionSubjectScore[]>;
}

export interface AdmissionProgramResult {
  university: string;
  profession: string;
  estimatedProbability?: number;
  historicalAdmissionScore?: { year: number; score: number };
}

export interface AdmissionPredictionResult {
  programs: AdmissionProgramResult[];
}

export type AdmissionPredictor = (
  request: AdmissionPredictionRequest,
) => Promise<AdmissionPredictionResult | null>;

export async function predictAdmission(
  request: AdmissionPredictionRequest,
): Promise<AdmissionPredictionResult | null> {
  void request;
  return null;
}

export function isAdmissionPredictionRequest(value: unknown): value is AdmissionPredictionRequest {
  if (typeof value !== 'object' || value === null) return false;
  const request = value as Record<string, unknown>;
  const subjects = request.subjectScores;
  if (typeof subjects !== 'object' || subjects === null) return false;
  const subjectScores = subjects as Record<string, unknown>;
  const subgroupIsValid = request.subgroup === undefined
    || request.subgroup === 'RK'
    || request.subgroup === 'RI'
    || request.subgroup === 'DT'
    || request.subgroup === 'TC';
  const isSubjectList = (items: unknown) => Array.isArray(items) && items.every((item) => {
    if (typeof item !== 'object' || item === null) return false;
    const subject = item as Record<string, unknown>;
    return typeof subject.id === 'string'
      && typeof subject.subject === 'string'
      && typeof subject.score === 'number'
      && Number.isFinite(subject.score)
      && subject.score >= 0
      && subject.score <= 100
      && (subject.coefficient === 1 || subject.coefficient === 1.5);
  });
  return typeof request.professionGroup === 'string'
    && professionGroups.some((group) => group === request.professionGroup)
    && subgroupIsValid
    && (request.examinationLanguage === 'az' || request.examinationLanguage === 'ru')
    && (request.university === undefined || typeof request.university === 'string')
    && (request.profession === undefined || typeof request.profession === 'string')
    && typeof request.graduationExamScore === 'number'
    && Number.isFinite(request.graduationExamScore)
    && request.graduationExamScore >= 0
    && request.graduationExamScore <= admissionRules.graduationMaximum
    && typeof request.admissionExamScore === 'number'
    && Number.isFinite(request.admissionExamScore)
    && request.admissionExamScore >= 0
    && request.admissionExamScore <= admissionRules.admissionMaximum
    && isSubjectList(subjectScores.graduation)
    && isSubjectList(subjectScores.admission);
}
