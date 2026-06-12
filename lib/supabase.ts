import { createClient } from '@supabase/supabase-js'
import { TIER_LIMITS, TIER_PRICING, TIER_FEATURE_BULLETS, TIER_LABEL, type TierID } from './pricing-config'
import type { LocaleId } from './prompts/locales/types'

export type Plan = TierID

export type User = {
  id: string
  linkedin_id: string
  linkedin_name: string | null
  email: string | null
  linkedin_picture: string | null
  linkedin_headline: string | null
  linkedin_access_token: string | null
  linkedin_token_expires_at: string | null
  linkedin_scopes: string[] | null
  subscription_status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'access_code'
  trial_posts_used: number
  subscription_count: number
  created_at: string
  updated_at: string
}

export type AccessCode = {
  id: string
  code: string
  plan: Plan
  max_uses: number
  uses_count: number
  expires_at: string | null
  /** NULL = lifetime grant. Positive int = days of access before auto-revert. */
  duration_days: number | null
  created_by: string | null
  is_active: boolean
  created_at: string
}

export type UserProfile = {
  id: string
  user_id: string
  // Basic info
  name: string | null
  role: string | null
  industry: string | null
  company: string | null
  years_experience: number | null
  age: number | null
  linkedin_url: string | null
  // Legacy fields
  job_title: string | null
  topics: string[] | null
  writing_style: 'professional' | 'conversational' | 'thought_leader'
  tone: 'authoritative' | 'friendly' | 'inspirational' | 'educational'
  post_examples: string | null
  // New onboarding fields
  voice_fingerprint: string | null
  mcq_answers: Record<string, string | string[]> | null
  content_pillars: string[] | null
  control_preference: 'autopilot' | 'approve' | 'suggest' | null
  writing_sample: string | null
  voice_locale: LocaleId
  plan: Plan | null
  onboarding_completed_at: string | null
  tour_completed_at: string | null
  posts_used_this_month: number
  posts_limit: number
  // Schedule preferences
  preferred_days: string[] | null
  preferred_post_hour: number
  timezone: string
  // Profile beautifier inputs
  current_about: string | null
  current_skills: string[] | null
  // Trust & compliance
  trust_score: number
  risk_score: number
  flagged_count: number
  autopilot_eligible: boolean
  created_at: string
  updated_at: string
}

export type Post = {
  id: string
  user_id: string
  content: string
  status: 'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'rejected'
  scheduled_at: string | null
  published_at: string | null
  linkedin_post_id: string | null
  source: 'ai_generated' | 'voice_note' | 'story_bank' | 'manual'
  voice_note_id: string | null
  story_bank_id: string | null
  generation_prompt: string | null
  content_pillar: string | null
  experiment_id: string | null
  variant: 'control' | 'treatment' | null
  reshares: number | null
  saves: number | null
  link_clicks: number | null
  members_reached: number | null
  followers_gained: number | null
  profile_views_from_post: number | null
  metric_source: 'creator_api' | 'public_fallback' | 'manual' | null
  metrics_synced_at: string | null
  format: string | null
  approval_token: string | null
  approval_sent_at: string | null
  human_approved: boolean
  failure_reason: string | null
  image_urls: string[] | null
  // Compliance scores
  spam_score: number | null
  humanity_score: number | null
  hook_similarity_score: number | null
  originality_score: number | null
  requires_manual_review: boolean
  similarity_score: number | null
  created_at: string
  updated_at: string
}

export type ComplianceEvent = {
  id: string
  user_id: string
  post_id: string | null
  event_type: string
  severity: 'low' | 'medium' | 'high'
  details: Record<string, unknown>
  created_at: string
}

export type VoiceNote = {
  id: string
  user_id: string
  file_name: string | null
  transcript: string | null
  status: 'pending' | 'transcribed' | 'failed'
  created_at: string
}

export type StoryBank = {
  id: string
  user_id: string
  raw_text: string
  title: string | null
  status: 'raw' | 'converted' | 'dismissed'
  created_at: string
}

export type LinkedInScore = {
  id: string
  user_id: string
  score: number
  breakdown: {
    posting_consistency: number
    avg_engagement: number
    profile_completeness: number
  }
  recorded_at: string
}

export type MetricSource = 'creator_api' | 'public_fallback' | 'manual'

export type GrowthBreakdown = {
  reach: number
  audience: number
  resonance: number
  authority: number
  weights: { reach: number; audience: number; resonance: number; authority: number }
  baseline_window: number
  n_posts: number
  w_self: number
  source: MetricSource
}

export type GrowthScore = {
  id: string
  user_id: string
  score: number
  breakdown: GrowthBreakdown
  captured_at: string
}

export type CohortBaseline = {
  id: string
  cohort_key: string
  reach_median: number | null
  audience_median: number | null
  resonance_median: number | null
  authority_median: number | null
  n_users: number
  computed_at: string
}

export type ImageBrief = {
  id: string
  user_id: string
  prompts: string[]
  month: string
  created_at: string
}

export type TrendsCache = {
  id: string
  industry: string
  data: Record<string, unknown>
  fetched_at: string
}

export type PostSuggestion = {
  id: string
  user_id: string
  suggestion_text: string
  angle: string | null
  hashtags: string[] | null
  why_it_works: string | null
  source: 'news' | 'trends' | 'history' | 'story_bank' | 'repurpose'
  status: 'pending' | 'used' | 'dismissed'
  created_at: string
}

export type PostAnalytics = {
  id: string
  post_id: string
  user_id: string
  captured_at: string
  age_minutes: number | null
  impressions: number | null
  reactions: number | null
  comments: number | null
  reshares: number | null
  saves: number | null
  link_clicks: number | null
  members_reached: number | null
  source: MetricSource | null
}

export type FollowerSnapshot = {
  id: string
  user_id: string
  snapshot_date: string
  follower_count: number
  source: MetricSource | null
  created_at: string
}

export type ProfileAnalytics = {
  id: string
  user_id: string
  snapshot_date: string
  profile_views: number | null
  search_appearances: number | null
  source: MetricSource | null
  created_at: string
}

export type PostImage = {
  id: string
  user_id: string
  storage_path: string
  public_url: string
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  ai_description: string | null
  ai_mood: string | null
  ai_topics: string[] | null
  ai_text_detected: string | null
  ai_post_hooks: string[] | null
  ai_content_pillars: string[] | null
  analysed_at: string | null
  uploaded_at: string
  used_in_post_ids: string[] | null
  kind: 'ai_photo' | 'template'
  template_type: 'quote' | 'stat' | 'title' | 'list' | 'myth' | null
  theme: string | null
  aspect_ratio: string | null
}

export type BrandKit = {
  id: string
  user_id: string
  name: string | null
  agency_client_id: string | null
  primary_color: string | null
  accent_color: string | null
  logo_url: string | null
  font_family: string | null
  font_url: string | null
  is_default: boolean
  created_at: string
  updated_at: string
}

export type CarouselSlide = {
  kind: 'cover' | 'body' | 'cta'
  headline: string
  body?: string
  image_url?: string
}

export type Carousel = {
  id: string
  user_id: string
  post_id: string | null
  theme: string
  slides: CarouselSlide[]
  pdf_url: string | null
  png_urls: string[] | null
  status: 'draft' | 'rendering' | 'ready' | 'failed'
  created_at: string
  updated_at: string
}

export type LibraryItem = {
  id: string
  source: 'curated' | 'first_party' | 'community'
  slug: string | null
  title: string | null
  niche: string | null
  format: string | null
  hook_type: string | null
  pattern_summary: string | null
  template_text: string | null
  engagement_tier: 'high' | 'top' | null
  contributed_by: string | null
  attributed: boolean
  is_public: boolean
  created_at: string
  /** Joined client-side: whether the current user has saved this item. */
  saved?: boolean
}

export type SwipeSave = {
  id: string
  user_id: string
  library_item_id: string
  notes: string | null
  created_at: string
}

export type LinkedInAccount = {
  id: string
  user_id: string
  account_type: 'personal' | 'company'
  linkedin_id: string
  name: string | null
  picture_url: string | null
  subscription_status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled'
  dodo_subscription_id: string | null
  plan: Plan | null
  posts_limit: number
  posts_used_this_month: number
  created_at: string
  updated_at: string
}

export type Agency = {
  id: string
  name: string
  email: string
  password_hash: string
  seat_limit: number
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AgencyClient = {
  id: string
  agency_id: string
  user_id: string
  client_name: string
  is_active: boolean
  created_at: string
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/**
 * Plan posts + price + label — derived from lib/pricing-config.ts.
 * Kept for back-compat with onboarding/save and access-codes/apply that read .posts.
 * Use TIER_LIMITS / TIER_PRICING directly for new code.
 */
export const PLAN_LIMITS: Record<string, { posts: number; price: number; label: string }> = {
  free:     { posts: TIER_LIMITS.free.postsPerMonth ?? 0,     price: 0,                              label: TIER_LABEL.free },
  starter:  { posts: TIER_LIMITS.starter.postsPerMonth ?? 0,  price: TIER_PRICING.starter.INR.monthly,  label: TIER_LABEL.starter },
  standard: { posts: TIER_LIMITS.standard.postsPerMonth ?? 0, price: TIER_PRICING.standard.INR.monthly, label: TIER_LABEL.standard },
  pro:      { posts: TIER_LIMITS.pro.postsPerMonth ?? 0,      price: TIER_PRICING.pro.INR.monthly,      label: TIER_LABEL.pro },
  agency:   { posts: 0,                                       price: 0,                              label: TIER_LABEL.agency },
}

export const PLAN_FEATURES = TIER_FEATURE_BULLETS

export const CONTENT_PILLARS = [
  'Leadership', 'Innovation', 'Industry Insights', 'Personal Growth',
  'Behind the Scenes', 'Team Culture', 'Client Success', 'Lessons Learned',
  'Career Advice', 'Entrepreneurship',
]

export type ExperimentDimension = 'timing' | 'format' | 'pillar' | 'hook' | 'length'
export type ExperimentStatus = 'running' | 'won' | 'lost' | 'inconclusive'
export type Variant = 'control' | 'treatment'

export type ExperimentResult = {
  lift: number
  confidence: number
  n: number
  decision: 'won' | 'lost' | 'inconclusive' | 'keep_running'
  rollback: boolean
  evaluated_at: string
}

export type Experiment = {
  id: string
  user_id: string
  hypothesis: string
  dimension: ExperimentDimension
  control: Record<string, unknown>
  treatment: Record<string, unknown>
  baseline_metric: string
  started_at: string
  ended_at: string | null
  status: ExperimentStatus
  result: ExperimentResult | null
  created_at: string
}
