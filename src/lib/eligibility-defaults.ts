import type { EligibilityCriteria } from './eligibility-types';

export const EMPTY_ELIGIBILITY: EligibilityCriteria = {
  grades: [],
  schoolBoards: [],
  specificSchools: [],
  targetInstitutions: [],
  fields: [],
  minAverage: null,
  minAge: null,
  maxAge: null,
  genderRequired: null,
  indigenousRequired: false,
  bipocRequired: false,
  financialNeed: false,
  maxFamilyIncome: null,
  fosterCare: false,
  citizenship: 'any',
  apprenticeship: false,
  extracurriculars: [],
}
