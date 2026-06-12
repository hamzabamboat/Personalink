export type AttentionKind = 'overdue' | 'failed' | null

/**
 * Classify a post that needs the user's attention:
 * - 'failed'  — publishing failed (status === 'failed')
 * - 'overdue' — still marked 'scheduled' but its time has already passed
 * - null      — healthy (upcoming scheduled, draft, published, pending_approval, …)
 */
export function postAttentionKind(
  post: { status: string; scheduled_at: string | null },
  now: Date = new Date(),
): AttentionKind {
  if (post.status === 'failed') return 'failed'
  if (post.status === 'scheduled' && post.scheduled_at && new Date(post.scheduled_at) < now) {
    return 'overdue'
  }
  return null
}
