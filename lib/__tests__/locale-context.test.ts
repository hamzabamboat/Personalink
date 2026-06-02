import { describe, it, expect } from 'vitest'
import { BASE_RULES } from '../prompts/base-rules'
import { buildLocaleContext, buildLocaleTail } from '../prompts/locales/context'

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

describe('buildLocaleContext', () => {
  it('is empty for english', () => {
    expect(buildLocaleContext('english', 0)).toBe('')
  })

  it('includes register, QA self-check, and the requested number of examples for hinglish', () => {
    const out = buildLocaleContext('hinglish', 3, 0)
    expect(out).toContain('Hinglish')
    expect(out.toLowerCase()).toContain('before responding')
    // 3 injected examples, each rendered inside a fenced block
    expect((out.match(/"""/g) || []).length).toBe(6)
  })
})

describe('buildLocaleTail', () => {
  it('is empty for english', () => {
    expect(buildLocaleTail('english', 0)).toBe('')
  })

  it('carries examples + QA but NOT the register block (register is cached separately)', () => {
    const tail = buildLocaleTail('indian_english', 2, 0)
    expect(tail.toLowerCase()).toContain('before responding')
    expect((tail.match(/"""/g) || []).length).toBe(4)
    // the long register instructions must not be duplicated into the tail
    expect(tail).not.toContain('LANGUAGE & REGISTER:')
  })
})
