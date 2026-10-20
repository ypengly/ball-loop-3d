import { create } from 'zustand'

/** Transient UI-only state (never persisted). */
interface UIStore {
  /** Skin being previewed on the customize screen; null = use the selected one. */
  previewSkin: string | null
  setPreviewSkin: (id: string | null) => void
}

export const useUI = create<UIStore>(set => ({
  previewSkin: null,
  setPreviewSkin: id => set({ previewSkin: id }),
}))
