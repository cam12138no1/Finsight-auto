import { describe, it, expect } from 'vitest'
import {
  getCompanyCategory,
  getAnalysisPrompt,
  COMPANY_CATEGORIES,
  getResearchComparisonPrompt,
  getComparisonExtractionPrompt,
} from './prompts'

describe('lib/ai/prompts', () => {
  describe('getCompanyCategory', () => {
    it('returns AI_APPLICATION for META', () => {
      const result = getCompanyCategory('META')
      expect(result.category).toBe('AI_APPLICATION')
      expect(result.company?.symbol).toBe('META')
    })

    it('returns AI_APPLICATION for GOOGL', () => {
      const result = getCompanyCategory('GOOGL')
      expect(result.category).toBe('AI_APPLICATION')
    })

    it('returns AI_APPLICATION for MSFT', () => {
      const result = getCompanyCategory('MSFT')
      expect(result.category).toBe('AI_APPLICATION')
      expect(result.company?.name).toBe('Microsoft')
    })

    it('returns AI_SUPPLY_CHAIN for NVDA', () => {
      const result = getCompanyCategory('NVDA')
      expect(result.category).toBe('AI_SUPPLY_CHAIN')
      expect(result.company?.symbol).toBe('NVDA')
    })

    it('returns AI_SUPPLY_CHAIN for lowercase nvda', () => {
      const result = getCompanyCategory('nvda')
      expect(result.category).toBe('AI_SUPPLY_CHAIN')
    })

    it('returns AI_SUPPLY_CHAIN for TSM', () => {
      const result = getCompanyCategory('TSM')
      expect(result.category).toBe('AI_SUPPLY_CHAIN')
    })

    it('returns UNKNOWN for unknown symbol', () => {
      const result = getCompanyCategory('XXXXX')
      expect(result.category).toBe('UNKNOWN')
      expect(result.company).toBeUndefined()
    })

    it('matches by name (Alphabet)', () => {
      const result = getCompanyCategory('Alphabet')
      expect(result.category).toBe('AI_APPLICATION')
    })

    it('matches by Chinese name', () => {
      const result = getCompanyCategory('英伟达')
      expect(result.category).toBe('AI_SUPPLY_CHAIN')
    })
  })

  describe('getAnalysisPrompt', () => {
    it('returns string for AI_APPLICATION', () => {
      const prompt = getAnalysisPrompt('AI_APPLICATION')
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(100)
    })

    it('returns string for AI_SUPPLY_CHAIN', () => {
      const prompt = getAnalysisPrompt('AI_SUPPLY_CHAIN')
      expect(typeof prompt).toBe('string')
    })

    it('includes research comparison when hasResearchReport is true', () => {
      const withResearch = getAnalysisPrompt('AI_APPLICATION', true)
      const withoutResearch = getAnalysisPrompt('AI_APPLICATION', false)
      expect(withResearch.length).toBeGreaterThanOrEqual(withoutResearch.length)
    })
  })

  describe('COMPANY_CATEGORIES', () => {
    it('has AI_APPLICATION and AI_SUPPLY_CHAIN', () => {
      expect(COMPANY_CATEGORIES.AI_APPLICATION).toBeDefined()
      expect(COMPANY_CATEGORIES.AI_SUPPLY_CHAIN).toBeDefined()
      expect(COMPANY_CATEGORIES.AI_APPLICATION.name).toBe('AI应用公司')
      expect(COMPANY_CATEGORIES.AI_SUPPLY_CHAIN.name).toBe('AI供应链公司')
    })
  })

  describe('getResearchComparisonPrompt', () => {
    it('returns non-empty string', () => {
      const prompt = getResearchComparisonPrompt()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(50)
    })
  })

  describe('getComparisonExtractionPrompt', () => {
    it('returns non-empty string', () => {
      const prompt = getComparisonExtractionPrompt()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(50)
    })
  })
})
