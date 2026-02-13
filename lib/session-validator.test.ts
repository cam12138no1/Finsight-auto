import { describe, it, expect } from 'vitest'
import { validateDataAccess } from './session-validator'

describe('lib/session-validator', () => {
  describe('validateDataAccess', () => {
    it('allows access when dataUserId is undefined (legacy data)', () => {
      const result = validateDataAccess(undefined, 'current-user-123', 'TestAPI')
      expect(result).toBe(true)
    })

    it('allows access when data belongs to current user', () => {
      const result = validateDataAccess('user-1', 'user-1', 'TestAPI')
      expect(result).toBe(true)
    })

    it('denies access when data belongs to different user', () => {
      const result = validateDataAccess('user-1', 'user-2', 'TestAPI')
      expect(result).toBe(false)
    })
  })
})
