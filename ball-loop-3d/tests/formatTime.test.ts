import { describe, expect, it } from 'vitest'
import { formatDistance, formatTime } from '../src/utils/formatTime'

describe('formatTime', () => {
  it('formats zero and sub-second values', () => {
    expect(formatTime(0)).toBe('0:00.00')
    expect(formatTime(0.5)).toBe('0:00.50')
    expect(formatTime(0.07)).toBe('0:00.07')
  })
  it('formats seconds and minutes', () => {
    expect(formatTime(5.42)).toBe('0:05.42')
    expect(formatTime(65.42)).toBe('1:05.42')
    expect(formatTime(600)).toBe('10:00.00')
  })
  it('never rounds up into the next second', () => {
    expect(formatTime(59.999)).toBe('0:59.99')
  })
  it('renders placeholders for invalid input', () => {
    expect(formatTime(null)).toBe('--:--.--')
    expect(formatTime(undefined)).toBe('--:--.--')
    expect(formatTime(NaN)).toBe('--:--.--')
    expect(formatTime(-1)).toBe('--:--.--')
    expect(formatTime(Infinity)).toBe('--:--.--')
  })
})

describe('formatDistance', () => {
  it('formats metres with separators', () => {
    expect(formatDistance(0)).toBe('0 m')
    expect(formatDistance(1234.9)).toBe('1,234 m')
  })
  it('handles invalid input', () => {
    expect(formatDistance(null)).toBe('0 m')
    expect(formatDistance(NaN)).toBe('0 m')
  })
})
