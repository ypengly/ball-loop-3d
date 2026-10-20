import { createContext, useContext, type MutableRefObject } from 'react'
import type { RunLogic } from './systems/RunLogic'

export interface RunContextValue {
  logicRef: MutableRefObject<RunLogic>
}

export const RunContext = createContext<RunContextValue | null>(null)

export function useRunLogic(): MutableRefObject<RunLogic> {
  const ctx = useContext(RunContext)
  if (!ctx) throw new Error('useRunLogic must be used inside <RunContext.Provider>')
  return ctx.logicRef
}
