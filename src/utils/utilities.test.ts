import { describe, expect, it } from 'vitest'
import { randomInteger } from './math'
import { shuffle } from './shuffle'
import { createId } from './ids'

describe('question utilities', () => {
  it('includes both integer bounds and supports a single value', () => {
    expect(randomInteger(2, 7, () => 0)).toBe(2)
    expect(randomInteger(2, 7, () => 0.999999)).toBe(7)
    expect(randomInteger(3, 3)).toBe(3)
  })
  it('rejects invalid bounds and random values', () => {
    for (const [min, max] of [
      [2, 1],
      [0.5, 2],
      [0, Infinity],
    ]) {
      expect(() => randomInteger(min, max)).toThrow(RangeError)
    }
    for (const value of [-1, 1, NaN, Infinity]) {
      expect(() => randomInteger(0, 5, () => value)).toThrow(RangeError)
    }
  })
  it('shuffles without losing elements or mutating input', () => {
    const input = [1, 2, 3, 4]
    expect(shuffle(input, () => 0)).toEqual([2, 3, 4, 1])
    expect(input).toEqual([1, 2, 3, 4])
    expect(shuffle([], () => 0)).toEqual([])
    expect(shuffle([1], () => 0)).toEqual([1])
  })
  it('creates nonempty unique identifiers', () => {
    const ids = Array.from({ length: 200 }, createId)
    expect(new Set(ids).size).toBe(200)
    expect(ids.every((id) => id.length > 0)).toBe(true)
  })
})
