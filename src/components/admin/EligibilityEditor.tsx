import type { EligibilityCriteria } from '../../lib/eligibility-types'
import { EMPTY_ELIGIBILITY } from '../../lib/eligibility-types'

const GRADE_OPTIONS = ['10', '11', '12', 'post-secondary']
const FIELD_OPTIONS = ['STEM', 'health', 'business', 'arts', 'trades', 'agriculture', 'education', 'music', 'social_work', 'environmental', 'engineering', 'law', 'criminal_justice', 'humanities']
const EXTRACURRICULAR_OPTIONS = ['volunteer', 'music', 'sports', '4-H', 'science_fair', 'RAP']

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className="adm-opt">
      {label.replace(/_/g, ' ')}
    </button>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="adm-check">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

function toggleArr(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

export function EligibilityEditor({ value, onChange }: { value: EligibilityCriteria; onChange: (v: EligibilityCriteria) => void }) {
  const set = (patch: Partial<EligibilityCriteria>) => onChange({ ...value, ...patch })

  return (
    <>
      <div className="adm-field">
        <span className="adm-label">Grades</span>
        <div className="adm-opts">
          {GRADE_OPTIONS.map(g => (
            <ToggleChip key={g} label={g} active={value.grades.includes(g)} onClick={() => set({ grades: toggleArr(value.grades, g) })} />
          ))}
        </div>
      </div>

      <div className="adm-field">
        <span className="adm-label">Fields of study</span>
        <div className="adm-opts">
          {FIELD_OPTIONS.map(f => (
            <ToggleChip key={f} label={f} active={value.fields.includes(f)} onClick={() => set({ fields: toggleArr(value.fields, f) })} />
          ))}
        </div>
      </div>

      <div className="adm-grid-2">
        <div className="adm-field">
          <label htmlFor="eligibility-min-average">Lowest average, %</label>
          <input id="eligibility-min-average" type="number" className="adm-input" min={0} max={100}
            value={value.minAverage ?? ''}
            onChange={e => set({ minAverage: e.target.value ? parseInt(e.target.value, 10) : null })} placeholder="75" />
        </div>
        <div className="adm-field">
          <label htmlFor="eligibility-max-family-income">Highest family income, $</label>
          <input id="eligibility-max-family-income" type="number" className="adm-input" min={0}
            value={value.maxFamilyIncome ?? ''}
            onChange={e => set({ maxFamilyIncome: e.target.value ? parseInt(e.target.value, 10) : null })} placeholder="65000" />
        </div>
      </div>

      <div className="adm-field">
        <span className="adm-label">Who it is for</span>
        <div className="adm-checks">
          <Check label="Female students only" checked={value.genderRequired === 'female'} onChange={v => set({ genderRequired: v ? 'female' : null })} />
          <Check label="Indigenous students" checked={value.indigenousRequired} onChange={v => set({ indigenousRequired: v })} />
          <Check label="BIPOC students" checked={value.bipocRequired} onChange={v => set({ bipocRequired: v })} />
        </div>
      </div>

      <div className="adm-field">
        <span className="adm-label">Other requirements</span>
        <div className="adm-checks">
          <Check label="Financial need" checked={value.financialNeed} onChange={v => set({ financialNeed: v })} />
          <Check label="Foster care history" checked={value.fosterCare} onChange={v => set({ fosterCare: v })} />
          <Check label="RAP or apprenticeship" checked={value.apprenticeship} onChange={v => set({ apprenticeship: v })} />
        </div>
      </div>

      <div className="adm-field">
        <label htmlFor="eligibility-citizenship">Citizenship</label>
        <select id="eligibility-citizenship" className="adm-select"
          value={value.citizenship}
          onChange={e => set({ citizenship: e.target.value as EligibilityCriteria['citizenship'] })}>
          <option value="any">Any</option>
          <option value="canadian">Canadian citizens</option>
          <option value="permanent_resident">Citizens and permanent residents</option>
        </select>
      </div>

      <div className="adm-field">
        <span className="adm-label">Activities</span>
        <div className="adm-opts">
          {EXTRACURRICULAR_OPTIONS.map(x => (
            <ToggleChip key={x} label={x} active={value.extracurriculars.includes(x)} onClick={() => set({ extracurriculars: toggleArr(value.extracurriculars, x) })} />
          ))}
        </div>
      </div>

      <div>
        <button type="button" onClick={() => onChange({ ...EMPTY_ELIGIBILITY })} className="adm-btn adm-btn-danger">
          Clear all eligibility
        </button>
      </div>
    </>
  )
}
