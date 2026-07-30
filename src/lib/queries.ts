import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Energy, Profile, ProtectedWindow, Task, TaskKind } from './types'

/** Server state lives here. Local UI state goes in Zustand, never both. */

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase.from('profiles').select('*').single()
      if (error) throw error
      return data
    },
  })
}

export function useProtectedWindows() {
  return useQuery({
    queryKey: ['protected_windows'],
    queryFn: async (): Promise<ProtectedWindow[]> => {
      const { data, error } = await supabase
        .from('protected_windows')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}

/** Tasks for an inclusive range of dates, both formatted yyyy-MM-dd. */
export function useTasks(from: string, to: string) {
  return useQuery({
    queryKey: ['tasks', from, to],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .gte('scheduled_date', from)
        .lte('scheduled_date', to)
        .order('start_minute', { nullsFirst: false })
      if (error) throw error
      return data
    },
  })
}

/** The brain dump. Anything thought of but not committed to a day. */
export function useInbox() {
  return useQuery({
    queryKey: ['inbox'],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .is('scheduled_date', null)
        .eq('status', 'planned')
        .order('created_at')
      if (error) throw error
      return data
    },
  })
}

export type NewTask = {
  title: string
  energy: Energy
  duration_minutes: number
  scheduled_date: string | null
  start_minute: number | null
  due_date: string | null
  kind?: TaskKind
}

export function useAddTask() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (task: NewTask) => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Not signed in')
      const { error } = await supabase.from('tasks').insert({
        ...task,
        user_id: auth.user.id,
        // Giving something a time means you chose it, so the scheduler
        // leaves it where you put it.
        pinned: task.start_minute !== null,
        kind: task.kind ?? (task.start_minute !== null ? 'anchor' : 'flexible'),
      })
      if (error) throw error
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['tasks'] })
      client.invalidateQueries({ queryKey: ['inbox'] })
    },
  })
}

/** Editing an existing task. Only the fields passed get touched. */
export function useUpdateTask() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Task> & { id: string }) => {
      const { error } = await supabase.from('tasks').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['tasks'] })
      client.invalidateQueries({ queryKey: ['inbox'] })
    },
  })
}

export function useDeleteTask() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['tasks'] })
      client.invalidateQueries({ queryKey: ['inbox'] })
    },
  })
}

export function useCompleteTask() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: done ? 'done' : 'planned',
          completed_at: done ? new Date().toISOString() : null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useToggleTodaysTwo() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, counts }: { id: string; counts: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ counts_today: counts })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
