import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { rememberCity, MY_CITY_KEY } from './my-city'

describe('my city', () => {
  beforeEach(() => localStorage.clear())

  it('remembers the last city opened', () => {
    rememberCity('calgary')
    rememberCity('edmonton')
    expect(localStorage.getItem(MY_CITY_KEY)).toBe('edmonton')
  })

  it('is read by the home page under the same key', () => {
    const home = readFileSync(join(__dirname, '../pages/index.astro'), 'utf8')
    expect(home).toContain(`localStorage.getItem('${MY_CITY_KEY}')`)
  })
})
