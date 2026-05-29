/**
 * Verification script for lib/ai-detector.ts
 * Runs the structural detector against the user's original AI-sounding post,
 * a cleaner human-style rewrite, and a few synthetic stress tests.
 *
 * Run: npx tsx scripts/verify-ai-detector.ts
 */
import { detectAIStructures, shouldRewrite } from '../lib/ai-detector'

const AI_SOUNDING_POST = `Switching schools in 8th grade was the worst thing my parents did to me.

At least that's what I thought while sitting alone in a new classroom, knowing absolutely nobody, watching groups that had been friends since kindergarten.

I wasn't the kid who raised his hand. I definitely wasn't the kid who spoke first. I was comfortable being invisible, and now I was just... visible. And uncomfortable.

Funny how discomfort works though.

When you can't hide in familiar corners, you learn to build new ones. When your old friends aren't there to speak for you, you find your own voice. When nobody knows the quiet version of you, you get to try on a different one.

Today I can pitch to strangers, speak at events, cold call potential clients without my hands shaking (much).

None of that happens if I stay comfortable. None of that happens if my parents let me stay in my bubble.

Sometimes the worst thing is actually the best thing wearing a disguise. You just can't tell in the moment because you're too busy being terrified.

Still think they could've warned me better though.`

const HUMAN_STYLE_REWRITE = `Got moved to a new school in 8th grade.

I think about it more than I should.

For like two weeks I ate lunch in a bathroom stall. Not because anyone was mean to me, they didn't notice me enough to be mean. The cliques had been locked in since kindergarten. I'd walk into the cafeteria and there was just nowhere to put myself.

At my old school I never had to talk first. My friends did that. Here I either spoke up or I stayed invisible, and after a while invisible got worse than scared.

I cold call now. I pitch in rooms full of people who could buy or pass. Voice still cracks when I'm nervous. I keep going anyway.

My parents weren't trying to forge anything. There was a job change and I came along. The thing that broke me when I was 13 is doing most of the heavy lifting in my career now.

A heads up would've been nice.`

const SHOWCASE_POST = `I thought I'd close my Series A in 6 weeks.

It took 4 months.

Three things I learned the hard way:

1. Conviction isn't a thing investors hand you. You build it for them, one data point at a time.
2. The soft no is the cruellest no. It costs you a month before you accept it.
3. The fastest investor in the round sets the price of everyone else's hesitation.`

// A post that scores >= 20 but ONLY from weak patterns (no strong pattern).
// New gate logic should NOT fire on this — weak signals alone are noise.
const WEAK_ONLY_POST = `Most people don't realise things have shifted under their feet.

It's worth noting that mindset, perspective, and the way you show up are the real game now. Not the ways things used to be. Lessons, moments, opportunities are everywhere if you look, but most people miss them because they're stuck in old situations.

The thing about experiences is that they teach you in ways you don't expect.`

const CLEAN_HUMAN_POST = `Closed Series A last Friday after 4 months.

Wanted 6 weeks. Got 4 months. Different game.

The cruellest no isn't the hard no. It's the warm one from the partner who actually likes you, who walks you through the deck once more, who asks the team for materials, then ghosts for three weeks before sending a paragraph at midnight.

That one cost me five weeks.

The other thing nobody told me: the fastest investor in the round sets the price of every other partner's hesitation. Once Lakshmi at Bessemer was leading the term sheet within nine days of our intro, everyone else either matched her pace or fell off. Speed was the actual signal.

I'd have given up two weeks of runway to know that earlier.`

function bar(score: number) {
  const filled = Math.round(score / 5)
  return '█'.repeat(filled) + '░'.repeat(20 - filled)
}

function check(label: string, text: string, expect: 'flag' | 'pass') {
  const { score, patterns } = detectAIStructures(text)
  const triggers = shouldRewrite(score, patterns)
  const passed = expect === 'flag' ? triggers : !triggers
  const status = passed ? '✅' : '❌'
  console.log(`\n${status}  ${label}`)
  console.log(`    Score: ${score.toString().padStart(3)} / 100  ${bar(score)}`)
  console.log(`    Gate fires: ${triggers ? 'yes (rewrite)' : 'no (save as-is)'}`)
  console.log(`    Expected:   ${expect === 'flag' ? 'gate fires' : 'gate skips'}`)
  if (patterns.length) console.log(`    Patterns: ${patterns.join(', ')}`)
  return passed
}

console.log('═══════════════════════════════════════════════════════════════')
console.log('  AI-detector verification')
console.log('═══════════════════════════════════════════════════════════════')

const results = [
  check("User's original AI-sounding post (should flag)",       AI_SOUNDING_POST,     'flag'),
  check('Human-style rewrite of same story (should pass)',      HUMAN_STYLE_REWRITE,  'pass'),
  check('Landing-page showcase post (should flag — listicle)',  SHOWCASE_POST,        'flag'),
  check('Specific human post with names + numbers (should pass)', CLEAN_HUMAN_POST,   'pass'),
  check('Weak-signals-only post (score ≥ 20 but no strong pattern — should pass)', WEAK_ONLY_POST, 'pass'),
]

const allPassed = results.every(Boolean)

console.log('\n═══════════════════════════════════════════════════════════════')
console.log(allPassed ? '  ALL CHECKS PASSED' : '  SOME CHECKS FAILED')
console.log('═══════════════════════════════════════════════════════════════\n')
process.exit(allPassed ? 0 : 1)
