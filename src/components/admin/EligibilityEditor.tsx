import type { EligibilityCriteria } from '../../lib/eligibility-types'
import { EMPTY_ELIGIBILITY } from '../../lib/eligibility-types'

const GRADE_OPTIONS = ['10', '11', '12', 'post-secondary']
const FIELD_OPTIONS = ['STEM', 'health', 'business', 'arts', 'trades', 'agriculture', 'education', 'music', 'social_work', 'environmental', 'engineering', 'law', 'criminal_justice', 'humanities']
const EXTRACURRICULAR_OPTIONS = ['volunteer', 'music', 'sports', '4-H', 'science_fair', 'RAP']

function ToggleChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs px-2 py-0.5 rounded-full border transition"
      style={{
        background: active ? 'rgba(34,211,165,0.15)' : 'rgba(255,255,255,0.04)',
        borderColor: active ? 'rgba(34,211,165,0.4)' : 'rgba(255,255,255,0.1)',
        color: active ? '#22d3a5' : 'rgba(255,255,255,0.4)',
      }}
    >
      {label}
    </button>
  )
}

function toggleArr(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]
}

export function EligibilityEditor({ value, onChange }: { value: EligibilityCriteria; onChange: (v: EligibilityCriteria) => void }) {
  const set = (patch: Partial<EligibilityCriteria>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-3 text-xs">
      <div>
        <p className="text-white/40 mb-1.5">Grades</p>
        <div className="flex flex-wrap gap-1.5">
          {GRADE_OPTIONS.map(g => (
            <ToggleChip key={g} label={g} active={value.grades.includes(g)} onClick={() => set({ grades: toggleArr(value.grades, g) })} />
          ))}
        </div>
      </div>

      <div>
        <p className="text-white/40 mb-1.5">Fields of study</p>
        <div className="flex flex-wrap gap-1.5">
          {FIELD_OPTIONS.map(f => (
            <ToggleChip key={f} label={f} active={value.fields.includes(f)} onClick={() => set({ fields: toggleArr(value.fields, f) })} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-white/40 block mb-1">Min average (%)</label>
          <input
            type="number"
            value={value.minAverage ?? ''}
            onChange={e => set({ minAverage: e.target.value ? parseInt(e.target.value, 10) : null })}
            placeholder="e.g. 75"
            min={0} max={100}
            className="w-full bg-white/5 border border-white/10 rounded-sm px-2 py-1 text-white text-xs focus:outline-hidden focus:border-[#22d3a5]/50"
          />
        </div>
        <div>
          <label className="text-white/40 block mb-1">Max family income ($)</label>
          <input
            type="number"
            value={value.maxFamilyIncome ?? ''}
            onChange={e => set({ maxFamilyIncome: e.target.value ? parseInt(e.target.value, 10) : null })}
            placeholder="e.g. 65000"
            min={0}
            className="w-full bg-white/5 border border-white/10 rounded-sm px-2 py-1 text-white text-xs focus:outline-hidden focus:border-[#22d3a5]/50"
          />
        </div>
      </div>

      <div>
        <p className="text-white/40 mb-1.5">Identity requirements</p>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-white/50">
            <input type="checkbox" checked={value.genderRequired === 'female'} onChange={e => set({ genderRequired: e.target.checked ? 'female' : null })} className="accent-[#22d3a5] w-3 h-3" />
            Female-identifying only
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-white/50">
            <input type="checkbox" checked={value.indigenousRequired} onChange={e => set({ indigenousRequired: e.target.checked })} className="accent-[#22d3a5] w-3 h-3" />
            Indigenous required
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-white/50">
            <input type="checkbox" checked={value.bipocRequired} onChange={e => set({ bipocRequired: e.target.checked })} className="accent-[#22d3a5] w-3 h-3" />
            BIPOC required
          </label>
        </div>
      </div>

      <div>
        <p className="text-white/40 mb-1.5">Other requirements</p>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer text-white/50">
            <input type="checkbox" checked={value.financialNeed} onChange={e => set({ financialNeed: e.target.checked })} className="accent-[#22d3a5] w-3 h-3" />
            Financial need
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-white/50">
            <input type="checkbox" checked={value.fosterCare} onChange={e => set({ fosterCare: e.target.checked })} className="accent-[#22d3a5] w-3 h-3" />
            Foster care history
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-white/50">
            <input type="checkbox" checked={value.apprenticeship} onChange={e => set({ apprenticeship: e.target.checked })} className="accent-[#22d3a5] w-3 h-3" />
            RAP/apprenticeship
          </label>
        </div>
      </div>

      <div>
        <p className="text-white/40 mb-1.5">Citizenship</p>
        <select
          value={value.citizenship}
          onChange={e => set({ citizenship: e.target.value as EligibilityCriteria['citizenship'] })}
          className="bg-[#1a1a24] border border-white/10 rounded-sm px-2 py-1 text-xs text-white focus:outline-hidden focus:border-[#22d3a5]/50"
        >
          <option value="any">Any</option>
          <option value="canadian">Canadian citizens</option>
          <option value="permanent_resident">Citizens + PRs</option>
        </select>
      </div>

      <div>
        <p className="text-white/40 mb-1.5">Extracurriculars</p>
        <div className="flex flex-wrap gap-1.5">
          {EXTRACURRICULAR_OPTIONS.map(e => (
            <ToggleChip key={e} label={e} active={value.extracurriculars.includes(e)} onClick={() => set({ extracurriculars: toggleArr(value.extracurriculars, e) })} />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange({ ...EMPTY_ELIGIBILITY })}
        className="text-white/20 hover:text-red-400 transition text-xs mt-1"
      >
        Clear all eligibility data
      </button>
    </div>
  )
}
