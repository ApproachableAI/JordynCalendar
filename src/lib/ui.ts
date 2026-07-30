import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Local UI state only. Anything that comes from the database lives in
 * TanStack Query instead, never both.
 */
type UiState = {
  listOpen: boolean
  setListOpen: (open: boolean) => void
  toggleList: () => void
}

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      // Open by default, because the whole point is seeing it beside the day.
      listOpen: true,
      setListOpen: (listOpen) => set({ listOpen }),
      toggleList: () => set((s) => ({ listOpen: !s.listOpen })),
    }),
    { name: 'calendar-ui' },
  ),
)
