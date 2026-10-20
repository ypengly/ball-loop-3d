import type { ButtonHTMLAttributes } from 'react'
import { AudioManager } from '../../game/systems/AudioManager'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'md' | 'lg' | 'sm'
  silent?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-linear-to-b from-[#5fe3ff] to-[#1f7bff] text-[#04112e] shadow-[0_6px_0_#0d3b9e,0_12px_24px_rgba(31,123,255,0.45)] hover:brightness-110 active:translate-y-[3px] active:shadow-[0_3px_0_#0d3b9e]',
  secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/20 active:bg-white/25',
  ghost: 'bg-transparent text-white/80 hover:text-white hover:bg-white/10',
  danger: 'bg-linear-to-b from-[#ff7a85] to-[#e0283a] text-white shadow-[0_5px_0_#7a1220] active:translate-y-[2px] active:shadow-[0_3px_0_#7a1220]',
}
const SIZES = { sm: 'px-3 py-1.5 text-sm', md: 'px-5 py-2.5 text-base', lg: 'px-8 py-3.5 text-xl' }

export function Button({ variant = 'secondary', size = 'md', silent, className = '', onClick, children, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      onClick={e => {
        if (!silent) AudioManager.play('click')
        onClick?.(e)
      }}
      className={`rounded-2xl font-extrabold tracking-wide uppercase transition-all duration-100 disabled:opacity-40 disabled:pointer-events-none select-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {children}
    </button>
  )
}
