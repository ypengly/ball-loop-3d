import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State { error: Error | null }

/** Catches render/WebGL errors so players see a message and a reload button, not a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Ball Loop 3D crashed:', error, info.componentStack) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#0b1230] p-6 text-center">
        <h1 className="text-2xl font-black">Something went wrong</h1>
        <p className="max-w-md text-sm text-white/70">{this.state.error.message || 'The game hit an unexpected error.'} If this keeps happening, try the Low graphics setting or a browser with WebGL enabled.</p>
        <button type="button" onClick={() => location.reload()} className="rounded-2xl bg-[#2fd8ff] px-6 py-3 font-black uppercase text-[#04112e]">Reload</button>
      </div>
    )
  }
}
