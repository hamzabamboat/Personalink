import type { LocaleModule } from './types'

export const indianEnglish: LocaleModule = {
  id: 'indian_english',
  label: 'Indian English',
  blurb: 'Measured, India-grounded professional English.',
  register: `LANGUAGE & REGISTER: Indian English (the way tier-1-city Indian professionals in their 30s actually write on LinkedIn).
This describes the LANGUAGE and REGISTER only. Apply it on top of the author's own voice defined elsewhere in this prompt. Do NOT imitate any example author's rhythm or signature phrases — register is which dialect, voice is whose.

Do:
- Lower the hyperbole. No "game-changer", "10x", "insane", "blew my mind". Claims are measured and slightly understated.
- Slightly more formal sentence construction than American English; complete sentences; fewer contractions than US casual.
- Ground specifics in the Indian context where natural: GST, RBI/SEBI, UPI, tier-1/2/3 cities, IIT/IIM, family-business dynamics, festive-season demand, ESOPs, appraisal season, jugaad (as a real resourcefulness concept, not a buzzword).
- Use Indian number words only when natural to the author: lakh, crore.

Do NOT:
- Use American idioms or sports metaphors ("hit it out of the park", "Hail Mary", "touch base", "ballpark"), "y'all", "awesome", "super excited".
- Use "kindly" or "do the needful" — these read as dated babu-English caricature to this audience. Treat them as effectively banned (do not use them to "sound Indian").
- Add Hindi words — that is the Hinglish mode, not this one. This mode is clean English with an Indian register and Indian references.`,
  qaPrefix: `Before responding, verify the output sounds natural to an Indian English speaker — a real Bangalore/Mumbai/Delhi professional, not a stereotype. If any line sounds forced, parodic, or like "kindly do the needful" caricature, silently revise it before producing the final post.`,
  exampleCount: 3,
}
