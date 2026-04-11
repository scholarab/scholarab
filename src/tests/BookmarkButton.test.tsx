import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import BookmarkButton from '../components/BookmarkButton'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockGetSaved, mockToggleSaved, mockGetSavedPrograms, mockToggleSavedProgram, mockShowToast, mockShowConfetti } =
  vi.hoisted(() => ({
    mockGetSaved:             vi.fn(() => [] as number[]),
    mockToggleSaved:          vi.fn((id: number) => [id]),
    mockGetSavedPrograms:     vi.fn(() => [] as number[]),
    mockToggleSavedProgram:   vi.fn((id: number) => [id]),
    mockShowToast:            vi.fn(),
    mockShowConfetti:         vi.fn(),
  }))

vi.mock('../lib/tracker.ts', () => ({
  getSaved:             mockGetSaved,
  toggleSaved:          mockToggleSaved,
  getSavedPrograms:     mockGetSavedPrograms,
  toggleSavedProgram:   mockToggleSavedProgram,
}))

vi.mock('../lib/utils.ts', () => ({
  showToast:    mockShowToast,
  showConfetti: mockShowConfetti,
}))

// ── Setup ─────────────────────────────────────────────────────────────────────

afterEach(() => cleanup())
beforeEach(() => {
  vi.clearAllMocks()
  mockGetSaved.mockReturnValue([])
  mockGetSavedPrograms.mockReturnValue([])
  // happy-dom supports animate but mock for stability
  if (!HTMLElement.prototype.animate) {
    Object.defineProperty(HTMLElement.prototype, 'animate', {
      value: vi.fn(() => ({ finished: Promise.resolve() })),
      configurable: true,
    })
  }
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BookmarkButton — initial state', () => {
  it('renders with "Save" aria-label when not saved', async () => {
    mockGetSaved.mockReturnValue([])
    await act(async () => { render(<BookmarkButton id={1} />) })
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
  })

  it('renders with "Remove bookmark" aria-label when already saved', async () => {
    mockGetSaved.mockReturnValue([1])
    await act(async () => { render(<BookmarkButton id={1} />) })
    expect(screen.getByRole('button', { name: 'Remove bookmark' })).toBeTruthy()
  })

  it('checks getSavedPrograms for program type', async () => {
    mockGetSavedPrograms.mockReturnValue([5])
    await act(async () => { render(<BookmarkButton id={5} type="program" />) })
    expect(screen.getByRole('button', { name: 'Remove bookmark' })).toBeTruthy()
  })

  it('checks getSaved for scholarship type', async () => {
    mockGetSaved.mockReturnValue([3])
    await act(async () => { render(<BookmarkButton id={3} type="scholarship" />) })
    expect(screen.getByRole('button', { name: 'Remove bookmark' })).toBeTruthy()
  })
})

describe('BookmarkButton — click behaviour', () => {
  it('calls toggleSaved for default (scholarship) type', async () => {
    mockToggleSaved.mockReturnValue([1])
    await act(async () => { render(<BookmarkButton id={1} />) })
    fireEvent.click(screen.getByRole('button'))
    expect(mockToggleSaved).toHaveBeenCalledWith(1)
  })

  it('calls toggleSavedProgram for program type', async () => {
    mockToggleSavedProgram.mockReturnValue([2])
    await act(async () => { render(<BookmarkButton id={2} type="program" />) })
    fireEvent.click(screen.getByRole('button'))
    expect(mockToggleSavedProgram).toHaveBeenCalledWith(2)
  })

  it('shows "Saved ✓" toast when transitioning to saved', async () => {
    mockToggleSaved.mockReturnValue([1]) // id now in list → nowSaved = true
    await act(async () => { render(<BookmarkButton id={1} />) })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(mockShowToast).toHaveBeenCalledWith('Saved ✓')
  })

  it('shows "Removed from saved" toast when transitioning to unsaved', async () => {
    mockGetSaved.mockReturnValue([1])
    mockToggleSaved.mockReturnValue([]) // id no longer in list → nowSaved = false
    await act(async () => { render(<BookmarkButton id={1} />) })
    fireEvent.click(screen.getByRole('button', { name: 'Remove bookmark' }))
    expect(mockShowToast).toHaveBeenCalledWith('Removed from saved')
  })

  it('calls showConfetti when transitioning to saved', async () => {
    mockToggleSaved.mockReturnValue([1])
    await act(async () => { render(<BookmarkButton id={1} />) })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(mockShowConfetti).toHaveBeenCalledTimes(1)
  })

  it('does not call showConfetti when removing a bookmark', async () => {
    mockGetSaved.mockReturnValue([1])
    mockToggleSaved.mockReturnValue([])
    await act(async () => { render(<BookmarkButton id={1} />) })
    fireEvent.click(screen.getByRole('button', { name: 'Remove bookmark' }))
    expect(mockShowConfetti).not.toHaveBeenCalled()
  })
})
