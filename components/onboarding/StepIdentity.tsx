'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const INDUSTRIES = [
  'Software & SaaS', 'Information Technology', 'Artificial Intelligence', 'Cybersecurity',
  'Data & Analytics', 'Blockchain & Crypto', 'Electronics & Hardware', 'Telecommunications',
  'Fintech', 'Banking', 'Financial Services', 'Insurance', 'Investment & Venture Capital',
  'Accounting', 'Management Consulting', 'Marketing & Advertising', 'Public Relations',
  'Sales', 'Human Resources & Recruiting', 'Design (UX/UI)', 'Media & Entertainment',
  'Publishing', 'Gaming', 'E-commerce', 'Retail', 'Consumer Goods (FMCG)',
  'Manufacturing', 'Automotive', 'Aerospace & Defense', 'Energy & Utilities',
  'Oil & Gas', 'Renewable Energy', 'Construction', 'Real Estate', 'Architecture',
  'Engineering', 'Transportation & Logistics', 'Supply Chain', 'Hospitality & Tourism',
  'Food & Beverage', 'Agriculture', 'Healthcare', 'Pharmaceuticals', 'Biotechnology',
  'Medical Devices', 'Education', 'EdTech', 'Non-Profit', 'Government & Public Sector',
  'Legal', 'Fashion & Apparel', 'Sports & Fitness', 'Beauty & Wellness',
  'Climate & Sustainability', 'Travel',
]

export type IdentityForm = {
  name: string
  role: string
  industry: string
  company: string
  age: string
  linkedin_url: string
}

type StepIdentityProps = {
  form: IdentityForm
  onChange: (updates: Partial<IdentityForm>) => void
  industryOther: boolean
  onIndustryOtherChange: (isOther: boolean) => void
}

export function StepIdentity({ form, onChange, industryOther, onIndustryOtherChange }: StepIdentityProps) {
  return (
    <div className="flex flex-col gap-5">
      {/* Full name */}
      <div>
        <Label className="mb-1.5">Full name<span className="text-red-500 ml-0.5">*</span></Label>
        <Input
          value={form.name}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="Arjun Mehta"
        />
      </div>

      {/* Role / Title */}
      <div>
        <Label className="mb-1.5">Role / Title<span className="text-red-500 ml-0.5">*</span></Label>
        <Input
          value={form.role}
          onChange={e => onChange({ role: e.target.value })}
          placeholder="e.g. Founder, Student, Consultant"
        />
      </div>

      {/* Industry — dropdown with Other */}
      <div>
        <Label className="mb-1.5">Industry<span className="text-red-500 ml-0.5">*</span></Label>
        <select
          value={industryOther ? 'Other' : form.industry}
          onChange={e => {
            const v = e.target.value
            if (v === 'Other') { onIndustryOtherChange(true); onChange({ industry: '' }) }
            else { onIndustryOtherChange(false); onChange({ industry: v }) }
          }}
          className="h-8 w-full min-w-0 rounded-lg border border-input px-2.5 py-1 text-base md:text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          style={{ color: 'var(--ink)', backgroundColor: 'var(--surface)' }}
        >
          <option value="" disabled style={{ color: 'var(--ink-3)', background: 'var(--surface)' }}>Select your industry…</option>
          {INDUSTRIES.map(ind => <option key={ind} value={ind} style={{ color: 'var(--ink)', background: 'var(--surface)' }}>{ind}</option>)}
          <option value="Other" style={{ color: 'var(--ink)', background: 'var(--surface)' }}>Other…</option>
        </select>
        {industryOther && (
          <Input
            className="mt-2"
            value={form.industry}
            onChange={e => onChange({ industry: e.target.value })}
            placeholder="Type your industry"
            autoFocus
          />
        )}
      </div>

      {/* Company / Institution */}
      <div>
        <Label className="mb-1.5">Company / Institution</Label>
        <Input
          value={form.company}
          onChange={e => onChange({ company: e.target.value })}
          placeholder="e.g. Acme Inc, IIT Bombay"
        />
      </div>

      {/* LinkedIn URL */}
      <div>
        <Label className="mb-1.5">LinkedIn profile URL<span className="text-red-500 ml-0.5">*</span></Label>
        <Input
          value={form.linkedin_url}
          onChange={e => onChange({ linkedin_url: e.target.value })}
          placeholder="https://linkedin.com/in/yourname"
        />
      </div>

      {/* Current age */}
      <div>
        <Label className="mb-1.5">Current age</Label>
        <Input
          type="number"
          value={form.age}
          onChange={e => onChange({ age: e.target.value })}
          placeholder="32"
        />
      </div>

      <p className="text-[12px] text-slate-400 mt-1">
        The more you fill out, the better we can personalise your content and match your voice exactly.
      </p>
    </div>
  )
}
