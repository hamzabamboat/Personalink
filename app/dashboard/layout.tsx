'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { User, UserProfile } from '@/lib/supabase'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  BarChart3,
  Lightbulb,
  Settings,
  Zap,
  Lock,
  X,
  Clock,
  LogOut,
  User as UserIcon,
  HelpCircle,
  ChevronDown,
  CalendarDays,
  BookOpen,
  Layers,
  MoreHorizontal,
  ImageIcon,
  Mail,
  Copy,
  Check as CheckIcon,
  Bell,
  Search,
  ChevronRight,
  Menu,
  Upload,
  Plus,
  Wand2,
  Compass,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppearanceTrigger } from '@/components/appearance-trigger'
import { WordMark } from '@/components/word-mark'
import { ErrorBoundary } from '@/components/error-boundary'
import { PWAInstallSidebarButton } from '@/components/pwa-install-prompt'
import { tierRank, getNextTier, TIER_LABEL, TIER_LIMITS, type TierID } from '@/lib/pricing-config'
import { TourProvider } from '@/components/tour/TourProvider'
import { TourOverlay } from '@/components/tour/TourOverlay'
import { useTour } from '@/components/tour/tour-context'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties; size?: number; color?: string }>
  exact?: boolean
  minPlan?: string
  badge?: 'ai' | 'new' | number
}

const NAV_SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Content',
    items: [
      { href: '/dashboard',             label: 'Overview',       icon: LayoutDashboard, exact: true },
      { href: '/dashboard/generate',    label: 'Generate',       icon: Sparkles,    badge: 'ai' },
      { href: '/dashboard/posts',       label: 'Posts',          icon: FileText },
      { href: '/dashboard/calendar',    label: 'Calendar',       icon: CalendarDays },
      { href: '/dashboard/carousel',    label: 'Carousels',      icon: Layers, minPlan: 'standard', badge: 'ai' },
      { href: '/dashboard/story-bank',  label: 'Story bank',     icon: BookOpen },
    ],
  },
  {
    label: 'Insight',
    items: [
      { href: '/dashboard/analytics',   label: 'Analytics',      icon: BarChart3, minPlan: 'standard' },
      { href: '/dashboard/suggestions', label: 'Trending ideas', icon: Lightbulb, badge: 5 },
      { href: '/dashboard/library',     label: 'Inspiration',    icon: Compass, badge: 'new' },
      { href: '/dashboard/upload',      label: 'Image library',  icon: ImageIcon },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/dashboard/profile',         label: 'Voice & profile',    icon: UserIcon },
      { href: '/dashboard/profile-improve', label: 'Profile Beautifier', icon: Wand2, minPlan: 'standard', badge: 'ai' as const },
      { href: '/dashboard/settings',        label: 'Settings',           icon: Settings },
    ],
  },
]

const BOTTOM_NAV_ITEMS = [
  { href: '/dashboard',              label: 'Home',     icon: LayoutDashboard, exact: true },
  { href: '/dashboard/generate',     label: 'Generate', icon: Sparkles },
  { href: '/dashboard/calendar',     label: 'Calendar', icon: CalendarDays },
  { href: '/dashboard/story-bank',   label: 'Stories',  icon: BookOpen },
]

const MORE_ITEMS = [
  { href: '/dashboard/posts',           label: 'My Posts',           icon: FileText },
  { href: '/dashboard/suggestions',     label: 'Trending Ideas',     icon: Lightbulb },
  { href: '/dashboard/analytics',       label: 'Analytics',          icon: BarChart3 },
  { href: '/dashboard/upload',          label: 'Image Library',      icon: ImageIcon },
  { href: '/dashboard/profile',         label: 'Voice & Profile',    icon: UserIcon },
  { href: '/dashboard/profile-improve', label: 'Profile Beautifier', icon: Wand2 },
  { href: '/dashboard/settings',        label: 'Settings',           icon: Settings },
]

const SEARCH_TARGETS: { href: string; label: string }[] = [
  { href: '/dashboard',                  label: 'Overview' },
  { href: '/dashboard/generate',         label: 'Generate post' },
  { href: '/dashboard/generate?tab=bulk', label: 'Bulk · plan a month' },
  { href: '/dashboard/generate?tab=voice', label: 'Voice note → post' },
  { href: '/dashboard/posts',            label: 'My posts' },
  { href: '/dashboard/calendar',         label: 'Calendar' },
  { href: '/dashboard/story-bank',       label: 'Story bank' },
  { href: '/dashboard/analytics',        label: 'Analytics' },
  { href: '/dashboard/suggestions',      label: 'Trending ideas' },
  { href: '/dashboard/upload',           label: 'Image library' },
  { href: '/dashboard/profile',          label: 'Voice & profile' },
  { href: '/dashboard/profile-improve',  label: 'Profile beautifier' },
  { href: '/dashboard/settings',         label: 'Settings' },
  { href: '/dashboard/settings?tab=plan', label: 'Plan & billing' },
  { href: '/dashboard/settings?tab=help', label: 'Help & FAQ' },
  { href: '/dashboard/upgrade',          label: 'Upgrade plan' },
]

function planRank(plan: string) {
  return tierRank(plan)
}

const USAGE_COLOR_DEFAULT = 'var(--pl-accent)'
const USAGE_COLOR_60 = '#eab308'
const USAGE_COLOR_80 = '#f97316'
const USAGE_COLOR_100 = '#ef4444'
function usageColor(pct: number): string {
  if (pct >= 100) return USAGE_COLOR_100
  if (pct >= 80) return USAGE_COLOR_80
  if (pct >= 60) return USAGE_COLOR_60
  return USAGE_COLOR_DEFAULT
}

function defaultPostsLimit(plan: string): number {
  return TIER_LIMITS[plan as TierID]?.postsPerMonth ?? TIER_LIMITS.free.postsPerMonth ?? 3
}

/* ── Topbar search (quick command palette) ───────────────── */
function TopbarSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const ref = useRef<HTMLDivElement>(null)

  const results = q.trim()
    ? SEARCH_TARGETS.filter(t => t.label.toLowerCase().includes(q.trim().toLowerCase()))
    : SEARCH_TARGETS

  useEffect(() => {
    function key(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); inputRef.current?.focus(); setOpen(true)
      } else if (e.key === 'Escape') {
        setOpen(false); inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [])

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function go(href: string) { setOpen(false); setQ(''); router.push(href) }

  return (
    <div ref={ref} className="relative" style={{ minWidth: 200 }}>
      <div className="flex items-center gap-2 h-8 px-3 rounded-md" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
        <Search size={13} style={{ color: 'var(--ink-4)' }} />
        <input
          ref={inputRef}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); setActive(0) }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
            else if (e.key === 'Enter' && results[active]) { go(results[active].href) }
          }}
          placeholder="Search pages…"
          className="text-[12px] flex-1 bg-transparent outline-none border-0 p-0"
          style={{ color: 'var(--ink)', fontFamily: 'var(--f-sans)' }}
        />
        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-3)', color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>⌘K</span>
      </div>
      {open && (
        <div className="absolute left-0 right-0 mt-1 rounded-lg overflow-hidden z-50"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--sh-3)', top: '100%', maxHeight: 320, overflowY: 'auto' }}>
          {results.length === 0 ? (
            <div className="px-3 py-3 text-[12px]" style={{ color: 'var(--ink-4)' }}>No matches</div>
          ) : results.map((t, i) => (
            <button key={t.href} onMouseEnter={() => setActive(i)} onClick={() => go(t.href)}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-left transition-colors"
              style={{ background: i === active ? 'var(--surface-3)' : 'transparent', color: 'var(--ink-2)' }}>
              <Search size={12} style={{ color: 'var(--ink-4)' }} />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Notifications bell ───────────────────────────────────── */
type NotifPost = { id: string; content: string; scheduled_at: string | null }
function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotifPost[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/posts?status=pending_approval&order=scheduled_at&limit=6')
      .then(r => r.json())
      .then(d => setItems(d.posts || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-surface-3"
        style={{ border: '1px solid var(--line)', color: 'var(--ink-3)' }}
        title="Notifications">
        <Bell size={15} />
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold rounded-full bg-red-500 text-white">
            {items.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-[300px] rounded-lg overflow-hidden z-50"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--sh-3)', top: '100%' }}>
          <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
            <span className="text-[12px] font-semibold" style={{ color: 'var(--ink)' }}>Notifications</span>
            <span className="text-[10px]" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>{items.length} pending</span>
          </div>
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12px]" style={{ color: 'var(--ink-4)' }}>You&apos;re all caught up</div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {items.map(p => (
                <Link key={p.id} href={`/dashboard/posts?edit=${p.id}`} onClick={() => setOpen(false)}
                  className="block px-3 py-2.5 transition-colors hover:bg-surface-3" style={{ borderBottom: '1px solid var(--line)' }}>
                  <div className="text-[12px] font-medium mb-0.5" style={{ color: 'var(--ink)' }}>Post awaiting your approval</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--ink-4)' }}>{p.content?.split('\n')[0]?.slice(0, 60) || 'Untitled draft'}</div>
                </Link>
              ))}
            </div>
          )}
          <Link href="/dashboard/posts" onClick={() => setOpen(false)}
            className="block px-3 py-2.5 text-center text-[12px] font-semibold transition-colors hover:bg-surface-3"
            style={{ color: 'var(--pl-accent)' }}>
            View all posts →
          </Link>
        </div>
      )}
    </div>
  )
}

/* ── Replay tour (Help menu) ─────────────────────────────── */
function ReplayTourButton({ onNavigate }: { onNavigate: () => void }) {
  const tour = useTour()
  return (
    <button
      onClick={() => { onNavigate(); tour.start() }}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left transition-colors hover:bg-surface-3"
      style={{ color: 'var(--ink-2)' }}
    >
      <Compass size={14} style={{ color: 'var(--ink-4)' }} className="shrink-0" />
      Replay tour
    </button>
  )
}

/* ── Workspace Switcher ──────────────────────────────────── */
function WorkspaceSwitcher({ user, profile, plan }: { user: User | null; profile: UserProfile | null; plan: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const postsUsed  = profile?.posts_used_this_month ?? 0
  const postsLimit = profile?.posts_limit ?? defaultPostsLimit(plan)
  const planLabel  = TIER_LABEL[plan as TierID] ?? (plan.charAt(0).toUpperCase() + plan.slice(1))
  const firstName  = user?.linkedin_name?.split(' ')[0] ?? 'You'

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <div ref={ref} className="relative px-3 py-3 border-b" style={{ borderColor: 'var(--line)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2.5 rounded-lg p-2 transition-colors hover:bg-surface-3"
        style={{ background: 'transparent' }}
      >
        <Avatar className="w-8 h-8 shrink-0" style={{ borderRadius: 'var(--r-sm)' }}>
          <AvatarImage src={user?.linkedin_picture || ''} alt={user?.linkedin_name || ''} />
          <AvatarFallback style={{ borderRadius: 'var(--r-sm)', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', fontWeight: 700, fontSize: 13 }}>
            {user?.linkedin_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[13px] font-semibold truncate leading-tight" style={{ color: 'var(--ink)', fontFamily: 'var(--f-sans)' }}>{user?.linkedin_name ?? '...'}</div>
          <div className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}>
            {planLabel} · {postsUsed}/{postsLimit} posts
          </div>
        </div>
        <ChevronDown size={13} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--ink-4)' }} />
      </button>

      {open && (
        <div
          className="absolute left-3 right-3 mt-1 rounded-lg overflow-hidden z-50"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', boxShadow: 'var(--sh-3)', top: '100%' }}
        >
          <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface-2)' }}>
            <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{user?.linkedin_name}</div>
            <div className="text-[11px] truncate" style={{ color: 'var(--ink-4)', fontFamily: 'var(--f-mono)' }}>{user?.email}</div>
          </div>
          <div className="py-1">
            {getNextTier(plan as TierID) && (
              <Link href="/dashboard/upgrade" onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-[13px] font-semibold transition-colors hover:bg-surface-3"
                style={{ color: 'var(--pl-accent)' }}>
                <Zap size={14} className="shrink-0" />
                Upgrade Plan
              </Link>
            )}
            <Link href="/dashboard/settings" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-surface-3"
              style={{ color: 'var(--ink-2)' }}>
              <UserIcon size={14} style={{ color: 'var(--ink-4)' }} className="shrink-0" />
              My Profile
            </Link>
            <Link href="/dashboard/settings?tab=help" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-surface-3"
              style={{ color: 'var(--ink-2)' }}>
              <HelpCircle size={14} style={{ color: 'var(--ink-4)' }} className="shrink-0" />
              Help &amp; FAQ
            </Link>
            <ReplayTourButton onNavigate={() => setOpen(false)} />
          </div>
          <div style={{ borderTop: '1px solid var(--line)' }} className="py-1">
            <button onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-semibold text-red-500 transition-colors hover:bg-red-50">
              <LogOut size={14} className="shrink-0" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Sidebar Nav ─────────────────────────────────────────── */
function SidebarNav({ plan, pathname, collapsed }: { plan: string; pathname: string; collapsed: boolean }) {
  return (
    <nav className="flex-1 px-2 py-2 overflow-y-auto">
      {NAV_SECTIONS.map((section, si) => (
        <div key={section.label} className={si > 0 ? 'mt-3' : ''}>
          {!collapsed && (
            <div className="px-2 mb-1.5 text-[10px]" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>
              // {section.label.toLowerCase()}
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            {section.items.map(item => {
              const active = item.exact ? pathname === item.href : (pathname === item.href || pathname.startsWith(item.href + '/'))
              const locked = item.minPlan && planRank(plan) < planRank(item.minPlan)
              const href   = locked ? `/dashboard/upgrade?feature=${item.href.split('/').pop()}` : item.href
              const Icon   = item.icon

              return (
                <Link
                  key={item.href}
                  href={href}
                  title={collapsed ? item.label : undefined}
                  className={`sidebar-item relative flex items-center gap-2.5 rounded-md transition-all duration-150 group ${
                    collapsed ? 'justify-center px-2 py-2' : 'px-2.5 py-2'
                  }`}
                  style={{
                    background: active ? 'var(--ink)' : 'transparent',
                    color: active ? 'var(--bg)' : locked ? 'var(--ink-4)' : 'var(--ink-3)',
                  }}
                >
                  <Icon
                    className="shrink-0"
                    style={{
                      width: 16, height: 16,
                      color: active ? 'var(--bg)' : locked ? 'var(--ink-4)' : 'var(--ink-3)',
                    }}
                    strokeWidth={active ? 2 : 1.75}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-[13px]" style={{ fontFamily: 'var(--f-sans)', fontWeight: active ? 600 : 400 }}>
                        {item.label}
                      </span>
                      {locked && <Lock size={11} style={{ color: active ? 'var(--bg)' : 'var(--ink-4)' }} />}
                      {!locked && item.badge === 'ai' && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded" style={{ background: active ? 'rgba(255,255,255,.18)' : 'var(--pl-accent-soft)', color: active ? '#fff' : 'var(--pl-accent)', fontFamily: 'var(--f-mono)', letterSpacing: '.04em' }}>AI</span>
                      )}
                      {!locked && typeof item.badge === 'number' && (
                        <span className="inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded-full bg-red-500 text-white">{item.badge}</span>
                      )}
                    </>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

/* ── Sidebar Content ─────────────────────────────────────── */
function SidebarContent({ user, profile, plan, pathname, collapsed = false }: {
  user: User | null
  profile: UserProfile | null
  plan: string
  pathname: string
  collapsed?: boolean
}) {
  const postsUsed  = profile?.posts_used_this_month ?? 0
  const postsLimit = profile?.posts_limit ?? defaultPostsLimit(plan)
  const planLabel  = TIER_LABEL[plan as TierID] ?? (plan.charAt(0).toUpperCase() + plan.slice(1))
  const pct        = postsLimit > 0 ? Math.min((postsUsed / postsLimit) * 100, 100) : 0
  const barColor   = usageColor(pct)
  const nextTier   = getNextTier(plan as TierID)

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface)', borderRight: '1px solid var(--line)' }}>
      {/* Logo */}
      <div className={`pt-4 pb-3 border-b flex items-center ${collapsed ? 'justify-center px-3' : 'px-4'}`} style={{ borderColor: 'var(--line)' }}>
        <Link href="/dashboard">
          {collapsed
            ? <WordMark icon wordmark={false} iconSize={32} />
            : <WordMark icon wordmark iconSize={30} />
          }
        </Link>
      </div>

      {/* Workspace switcher — full only */}
      {!collapsed && (
        <WorkspaceSwitcher user={user} profile={profile} plan={plan} />
      )}
      {collapsed && user && (
        <div className="px-2 py-3 border-b flex justify-center" style={{ borderColor: 'var(--line)' }}>
          <Avatar className="w-8 h-8" style={{ borderRadius: 'var(--r-sm)' }}>
            <AvatarImage src={user.linkedin_picture || ''} />
            <AvatarFallback style={{ borderRadius: 'var(--r-sm)', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', fontWeight: 700, fontSize: 12 }}>
              {user.linkedin_name?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Nav */}
      <SidebarNav plan={plan} pathname={pathname} collapsed={collapsed} />

      {/* Upgrade banner */}
      {!collapsed && nextTier && (
        <div className="px-3 pb-2" style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          <div className="rounded-lg p-3" style={{ background: 'var(--bg-2)', border: '1px solid var(--line)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px]" style={{ fontFamily: 'var(--f-mono)', color: pct >= 100 ? barColor : 'var(--ink-4)' }}>
                {postsUsed}/{postsLimit} posts {pct >= 100 ? '— limit reached' : 'used'}
              </span>
              <Link href="/dashboard/upgrade"
                className="text-[11px] font-semibold flex items-center gap-0.5 transition-opacity hover:opacity-70"
                style={{ color: pct >= 80 ? barColor : 'var(--pl-accent)' }}>
                Upgrade to {TIER_LABEL[nextTier]} <ChevronRight size={10} />
              </Link>
            </div>
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--line-2)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
            </div>
          </div>
        </div>
      )}

      {/* PWA desktop install */}
      <PWAInstallSidebarButton collapsed={collapsed} />

      {/* Appearance trigger */}
      {!collapsed && (
        <div className="px-3 pb-3" style={{ paddingTop: 12 }}>
          <AppearanceTrigger variant="sidebar" />
        </div>
      )}
    </div>
  )
}

/* ── Banners ─────────────────────────────────────────────── */
interface Subscription {
  status: string
  trial_ends_at: string | null
  plan_id: string | null
  next_billing_date: string | null
}

function TrialBanner({ trialEndsAt, onDismiss }: { trialEndsAt: string; onDismiss: () => void }) {
  const end      = new Date(trialEndsAt)
  const now      = new Date()
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  const endDate  = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })
  return (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2.5 flex items-center gap-3">
      <Clock size={14} className="shrink-0 opacity-90" strokeWidth={2} />
      <p className="text-sm font-medium flex-1">
        Free trial ends in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> — no charge until <strong>{endDate}</strong>.
      </p>
      <Link href="/dashboard/settings?tab=plan" className="text-xs font-bold bg-white/20 hover:bg-white/30 transition-colors rounded-full px-3 py-1 shrink-0 whitespace-nowrap">
        Manage plan
      </Link>
      <button onClick={onDismiss} className="opacity-70 hover:opacity-100 transition-opacity shrink-0 ml-1">
        <X size={14} />
      </button>
    </div>
  )
}

/* ── Add Contact Toast ───────────────────────────────────── */
const SENDER_EMAIL        = 'noreply@personalink.in'
const CONTACT_DISMISSED_K = 'pl_add_contact_dismissed'

function AddContactToast() {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(CONTACT_DISMISSED_K)) {
      const t = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(t)
    }
  }, [])

  function dismiss() { setVisible(false); localStorage.setItem(CONTACT_DISMISSED_K, '1') }
  async function copy() {
    await navigator.clipboard.writeText(SENDER_EMAIL)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-20 md:bottom-6 right-4 z-50 w-[320px] overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--sh-3)' }}
        >
          <div className="flex items-start gap-3 p-4">
            <div className="w-9 h-9 flex items-center justify-center shrink-0 mt-0.5 rounded-lg" style={{ background: 'var(--pl-accent-soft)', borderRadius: 'var(--r-sm)' }}>
              <Mail size={16} style={{ color: 'var(--pl-accent)' }} strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold mb-1 leading-snug" style={{ color: 'var(--ink)' }}>Keep emails out of spam</p>
              <p className="text-[12px] leading-relaxed mb-3" style={{ color: 'var(--ink-3)' }}>
                Add our sender to your contacts so approval emails and weekly digests always reach your inbox.
              </p>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--bg-2)' }}>
                <span className="text-[12px] flex-1 truncate" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-2)' }}>{SENDER_EMAIL}</span>
                <button onClick={copy} style={{ color: 'var(--pl-accent)' }} title="Copy email">
                  {copied ? <CheckIcon size={13} strokeWidth={2.5} className="text-emerald-500" /> : <Copy size={13} strokeWidth={2} />}
                </button>
              </div>
            </div>
            <button onClick={dismiss} className="shrink-0 -mt-0.5 -mr-0.5 transition-colors" style={{ color: 'var(--ink-4)' }}>
              <X size={14} />
            </button>
          </div>
          <div style={{ borderTop: '1px solid var(--line)' }} className="flex">
            <button onClick={dismiss} className="flex-1 py-2.5 text-[12px] font-semibold transition-colors" style={{ color: 'var(--ink-3)', fontFamily: 'var(--f-mono)' }}>
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Topbar ──────────────────────────────────────────────── */
function Topbar({ pathname, user }: { pathname: string; user: User | null }) {
  const router = useRouter()
  const crumb  = pathname.split('/').filter(Boolean).slice(1).map(s => s.replace(/-/g, ' ')).join(' › ') || 'overview'

  return (
    <div
      className="hidden md:flex items-center gap-3 px-5 h-[54px] shrink-0"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', boxShadow: 'var(--sh-1)' }}
    >
      {/* Breadcrumb */}
      <span className="text-[11px] mr-auto" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.04em' }}>
        // Workspace <span style={{ color: 'var(--ink-3)' }}>› {crumb}</span>
      </span>

      {/* Search */}
      <TopbarSearch />

      {/* Notifications */}
      <NotificationsBell />

      {/* Help */}
      <Link href="/dashboard/settings?tab=help"
        className="flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-surface-3"
        style={{ border: '1px solid var(--line)', color: 'var(--ink-3)' }}
        title="Help & FAQ">
        <HelpCircle size={15} />
      </Link>

      {/* New post */}
      <Link href="/dashboard/generate"
        className="flex items-center gap-1.5 h-8 px-3.5 rounded-md text-[13px] font-semibold transition-all hover:opacity-90"
        style={{ background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--f-sans)' }}>
        <Plus size={14} strokeWidth={2.5} />
        New post
      </Link>

      {/* User pill */}
      <button onClick={() => router.push('/dashboard/settings')} className="flex items-center gap-2 h-8 px-2 rounded-md transition-colors hover:bg-surface-3" style={{ border: '1px solid var(--line)' }}>
        <Avatar className="w-5 h-5">
          <AvatarImage src={user?.linkedin_picture || ''} />
          <AvatarFallback style={{ fontSize: 9, background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', fontWeight: 700 }}>
            {user?.linkedin_name?.[0] || 'U'}
          </AvatarFallback>
        </Avatar>
        <span className="text-[12px] hidden lg:block" style={{ color: 'var(--ink-2)', fontFamily: 'var(--f-sans)' }}>
          {user?.linkedin_name?.split(' ')[0] ?? '…'}
        </span>
      </button>
    </div>
  )
}

/* ── Root layout ─────────────────────────────────────────── */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [user,         setUser]         = useState<User | null>(null)
  const [profile,      setProfile]      = useState<UserProfile | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [mobileOpen,   setMobileOpen]   = useState(false)
  const [moreOpen,     setMoreOpen]     = useState(false)
  const [trialDismissed, setTrialDismissed] = useState(false)
  const [agencyMode, setAgencyMode]     = useState<{ agencyName: string; clientName: string | null } | null>(null)
  const isOnline = useOnlineStatus()

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch('/api/me')
        if (r.status === 401) {
          await fetch('/api/auth/logout', { method: 'POST' })
          router.push('/')
          return
        }
        const d = await r.json()
        if (d?.user)         setUser(d.user)
        if (d?.profile)      setProfile(d.profile)
        if (d?.subscription) setSubscription(d.subscription)
        if (d?.agencyMode)   setAgencyMode(d.agencyMode)
      } catch {
        // Network error — stay on page, don't redirect (avoids loop when offline)
      }
    }
    load()
  }, [router, pathname])

  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    const titles: Record<string, string> = {
      '/dashboard':              'Dashboard — PersonaLink',
      '/dashboard/generate':     'Generate Post — PersonaLink',
      '/dashboard/posts':        'My Posts — PersonaLink',
      '/dashboard/calendar':     'Calendar — PersonaLink',
      '/dashboard/story-bank':   'Story Bank — PersonaLink',
      '/dashboard/analytics':    'Analytics — PersonaLink',
      '/dashboard/suggestions':  'Trending Ideas — PersonaLink',
      '/dashboard/upload':       'Image Library — PersonaLink',
      '/dashboard/profile':         'Voice & Profile — PersonaLink',
      '/dashboard/profile-improve': 'Profile Beautifier — PersonaLink',
      '/dashboard/settings':        'Settings — PersonaLink',
      '/dashboard/upgrade':      'Upgrade — PersonaLink',
    }
    document.title = titles[pathname] ?? 'PersonaLink'
  }, [pathname])

  const plan = profile?.plan || 'starter'
  const sidebarProps = { user, profile, plan, pathname }

  // Auto-start the first-run tour: onboarding finished, tour never seen, not in agency mode.
  const tourAutoStart =
    !!profile && !profile.tour_completed_at && !!profile.onboarding_completed_at && !agencyMode

  return (
    <TourProvider plan={plan} autoStart={tourAutoStart}>
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:w-16 lg:w-[240px] flex-col sticky top-0 h-screen overflow-y-auto shrink-0 transition-all duration-200"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--line)' }}
      >
        <div className="flex flex-col h-full lg:hidden">
          <SidebarContent {...sidebarProps} collapsed />
        </div>
        <div className="hidden lg:flex flex-col h-full">
          <SidebarContent {...sidebarProps} collapsed={false} />
        </div>
      </aside>

      {/* Mobile Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showCloseButton={false} className="p-0 w-[240px]" style={{ background: 'var(--surface)' }}>
          <SidebarContent {...sidebarProps} collapsed={false} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* System banners */}
        {!isOnline && (
          <div className="text-white text-center text-xs font-medium py-2 px-4 bg-slate-800">
            You're offline — changes won't be saved until you reconnect
          </div>
        )}
        {agencyMode && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-3 text-xs font-medium">
            <span>
              Managing{agencyMode.clientName ? `: ${agencyMode.clientName}` : ''} — on behalf of <strong>{agencyMode.agencyName}</strong>
            </span>
            <button
              onClick={async () => {
                await fetch('/api/agency/switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
                router.push('/agency/dashboard')
              }}
              className="shrink-0 bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-full font-semibold"
            >
              ← Back to agency
            </button>
          </div>
        )}
        {!agencyMode && !trialDismissed && subscription?.status === 'trial' && subscription.trial_ends_at && new Date(subscription.trial_ends_at) > new Date() && (
          <TrialBanner trialEndsAt={subscription.trial_ends_at} onDismiss={() => setTrialDismissed(true)} />
        )}

        {/* Desktop topbar */}
        <Topbar pathname={pathname} user={user} />

        {/* Mobile top bar */}
        <div className="md:hidden safe-pt flex items-center justify-between gap-2 px-3 shrink-0"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)', boxShadow: 'var(--sh-1)', minHeight: 54 }}>
          <Link href="/dashboard" className="flex items-center shrink-0">
            <WordMark icon wordmark iconSize={28} />
          </Link>
          <div className="flex items-center gap-1.5">
            <Link href="/dashboard/generate"
              className="flex items-center gap-1.5 h-9 px-3 rounded-full text-[12.5px] font-semibold transition-opacity active:opacity-80"
              style={{ background: 'var(--ink)', color: 'var(--bg)', fontFamily: 'var(--f-sans)' }}>
              <Plus size={14} strokeWidth={2.5} />
              New
            </Link>
            <button onClick={() => setMobileOpen(o => !o)}
              aria-label="Menu"
              className="p-2 rounded-md transition-colors hover:bg-surface-3 active:bg-surface-3"
              style={{ color: 'var(--ink-3)' }}>
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* Page content */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={pathname}
            className="flex-1 overflow-x-hidden pb-nav-safe"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          >
            <ErrorBoundary>{children}</ErrorBoundary>
          </motion.main>
        </AnimatePresence>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-pb" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)' }}>
        <div className="flex h-14">
          {BOTTOM_NAV_ITEMS.map(item => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
            const Icon   = item.icon
            return (
              <Link key={item.href} href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors"
                style={{ color: active ? 'var(--pl-accent)' : 'var(--ink-4)' }}
              >
                <Icon size={20} strokeWidth={active ? 2 : 1.75} />
                <span className={`text-[9px] font-semibold transition-opacity ${active ? 'opacity-100' : 'opacity-50'}`}>{item.label}</span>
              </Link>
            )
          })}
          <button onClick={() => setMoreOpen(true)}
            aria-label="More"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors"
            style={{ color: 'var(--ink-4)' }}>
            <MoreHorizontal size={20} strokeWidth={1.75} />
            <span className="text-[9px] font-semibold opacity-50">More</span>
          </button>
        </div>
      </nav>

      <AddContactToast />

      {/* More sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="pb-safe rounded-t-2xl px-4 pt-4" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
          <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--line-2)' }} />
          <div className="text-[10px] px-1 mb-2" style={{ fontFamily: 'var(--f-mono)', color: 'var(--ink-4)', letterSpacing: '.05em' }}>// more</div>
          <div className="flex flex-col gap-0.5">
            {MORE_ITEMS.map(item => {
              const Icon   = item.icon
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl min-h-[44px] transition-colors"
                  style={{
                    background: active ? 'var(--pl-accent-soft)' : 'transparent',
                    color: active ? 'var(--pl-accent)' : 'var(--ink-2)',
                  }}>
                  <Icon size={18} className="shrink-0" style={{ color: active ? 'var(--pl-accent)' : 'var(--ink-4)' }} strokeWidth={active ? 2 : 1.75} />
                  <span className="text-[14px]" style={{ fontFamily: 'var(--f-sans)', fontWeight: active ? 600 : 400 }}>{item.label}</span>
                </Link>
              )
            })}
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            <AppearanceTrigger variant="sidebar" />
          </div>
        </SheetContent>
      </Sheet>

      <TourOverlay />
    </div>
    </TourProvider>
  )
}
