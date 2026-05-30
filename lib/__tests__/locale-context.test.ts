import { describe, it, expect } from 'vitest'
import { BASE_RULES } from '../prompts/base-rules'

describe('BASE_RULES', () => {
  it('contains the universal rule + banned blocks', () => {
    expect(BASE_RULES).toContain('LinkedIn post rules:')
    expect(BASE_RULES).toContain('HASHTAGS (MANDATORY)')
    expect(BASE_RULES).toContain('BANNED phrases')
    expect(BASE_RULES).toContain('BANNED formats')
    expect(BASE_RULES).toContain('BANNED arcs')
  })

  it('does not reference samples as being "above" (they now come after the rules)', () => {
    expect(BASE_RULES).not.toContain('samples above')
  })
})
