import { describe, it, expect } from 'vitest'
import { deviceClass } from './device-class'

describe('deviceClass', () => {
  it('names phones, tablets and computers from real user agents', () => {
    expect(deviceClass('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1')).toBe('phone')
    expect(deviceClass('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36')).toBe('phone')
    expect(deviceClass('Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 Chrome/129.0 Safari/537.36')).toBe('tablet')
    expect(deviceClass('Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148')).toBe('tablet')
    expect(deviceClass('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36')).toBe('computer')
    expect(deviceClass('Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:131.0) Gecko/20100101 Firefox/131.0')).toBe('computer')
    expect(deviceClass('Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 Chrome/129.0 Safari/537.36')).toBe('computer')
  })

  it('takes Chromium\'s own mobile hint when it is sent', () => {
    expect(deviceClass('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/129.0 Safari/537.36', '?1')).toBe('phone')
    expect(deviceClass('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0', '?0')).toBe('computer')
  })
})
