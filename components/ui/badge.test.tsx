import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from './badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Success</Badge>)
    expect(screen.getByText('Success')).toBeInTheDocument()
  })

  it('renders with profit variant', () => {
    const { container } = render(<Badge variant="profit">+5%</Badge>)
    const badge = container.firstChild
    expect(badge).toBeInTheDocument()
  })

  it('renders with loss variant', () => {
    render(<Badge variant="loss">-3%</Badge>)
    expect(screen.getByText('-3%')).toBeInTheDocument()
  })
})
