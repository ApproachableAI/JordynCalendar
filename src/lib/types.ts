export type TaskKind = 'anchor' | 'daily' | 'quota' | 'flexible' | 'triggered'
export type Energy = 'chosen' | 'upkeep' | 'big_kid_stuff'
export type TaskStatus = 'planned' | 'done' | 'skipped' | 'deferred' | 'released'

export type Task = {
  id: string
  user_id: string
  template_id: string | null
  title: string
  energy: Energy
  intensity: number
  kind: TaskKind
  scheduled_date: string // yyyy-MM-dd
  start_minute: number | null
  duration_minutes: number
  status: TaskStatus
  completed_at: string | null
  counts_today: boolean
  immovable: boolean
  pinned: boolean
  follows_task_id: string | null
  due_date: string | null
  note: string | null
}

export type ProtectedWindow = {
  id: string
  label: string
  start_time: string // HH:mm:ss
  end_time: string
  min_minutes: number
  sort_order: number
}

export type Profile = {
  id: string
  wake_time: string // HH:mm:ss
  sleep_time: string
  timezone: string
  protected_open_minutes: number
  soft_daily_cap_minutes: number
  default_buffer_minutes: number
  schedules_weekends: boolean
}

/** A stretch of the day with nothing in it. The point of the product. */
export type OpenSpan = {
  startMinute: number
  endMinute: number
  minutes: number
  /** Overlaps a window the scheduler reserves and will not fill. */
  protected: boolean
}

export const ENERGIES: Energy[] = ['chosen', 'upkeep', 'big_kid_stuff']

export const ENERGY_LABEL: Record<Energy, string> = {
  chosen: 'chosen',
  upkeep: 'upkeep',
  big_kid_stuff: 'big kid stuff',
}
