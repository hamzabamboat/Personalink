import { createClient } from '@supabase/supabase-js'

export type User = {
  id: string
  linkedin_id: string
  linkedin_name: string | null
  email: string | null
  linkedin_picture: string | null
  linkedin_headline: string | null
  linkedin_access_token: string | null
  linkedin_token_expires_at: string | null
  subscription_status: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'access_code'
  trial_posts_used: number
  subscription_count: number
  created_at: string
  updated_at: string
}

export type AccessCode = {
  id: string
  code: string
  plan: 'starter' | 'standard' | 'pro'
  max_uses: number
  uses_count: number
  expires_at: string | null
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
  linkedin_url: string | null
  // Legacy fields
  job_title: string | null
  topics: string[] | null
  writing_style: 'professional' | 'conversational' | 'thought_leader'
  tone: 'authoritative' | 'friendly' | 'inspirational' | 'educational'
  post_examples: string | null
  // New onboarding fields
  voice_fingerprint: string | null
  mcq_answers: Record<string, string> | null
  content_pillars: string[] | null
  control_preference: 'autopilot' | 'approve' | 'suggest' | null
  writing_sample: string | null
  plan: 'starter' | 'standard' | 'pro' | null
  onboarding_completed_at: string | null
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
  content_pillars: string | null
  engagement_score: number | null
  impressions: number | null
  reactions: number | null
  comments: number | null
  approval_token: string | null
  approval_sent_at: string | null
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
  impressions: number | null
  reactions: number | null
  captured_at: string
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
  plan: 'starter' | 'standard' | 'pro' | null
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

export const PLAN_LIMITS: Record<string, { posts: number; price: number; label: string }> = {
  starter: { posts: 12, price: 999, label: 'Starter' },
  standard: { posts: 20, price: 2499, label: 'Standard' },
  pro: { posts: 30, price: 4999, label: 'Pro' },
}

export const PLAN_FEATURES = {
  starter: [
    'AI generation in your voice',
    'Story bank · 10 entries · 5 conversions',
    'Trend refreshes · 5/month',
    'Image uploads · 10/month',
    'Profile analyses · 2/month',
    'Batch generation · 1 run/month',
  ],
  standard: [
    'Everything in Starter, plus —',
    'Voice notes → post · 8/month',
    'AI image generations · 3/month',
    'Story bank · 30 entries · 10 conversions',
    'Image uploads · 30/month',
    'Profile analyses · 4/month',
    'Batch runs · 2/month',
  ],
  pro: [
    'Everything in Standard, plus —',
    'Repurpose engine · 10 runs/month',
    'Voice notes · 20/month · 60 min',
    'AI image generations · 10/month',
    'Story bank · 60 entries · 20 conversions',
    'Image uploads · 80/month',
    'Profile analyses · 8/month',
    'Batch runs · 4/month',
  ],
}

export const CONTENT_PILLARS = [
  'Leadership', 'Innovation', 'Industry Insights', 'Personal Growth',
  'Behind the Scenes', 'Team Culture', 'Client Success', 'Lessons Learned',
  'Career Advice', 'Entrepreneurship',
]
