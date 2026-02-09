# Private Fund Analysis Platform Constitution

## Mission

Empower private equity fund managers and analysts with AI-powered financial report analysis that delivers institutional-quality insights in minutes, not hours.

## Core Principles

### 1. Accuracy Above All
- All analysis must be grounded in actual financial data
- Never hallucinate metrics or guidance
- Always distinguish between actual results and consensus estimates
- Flag data quality issues explicitly

### 2. Professional Standards
- Follow sell-side analyst writing conventions
- Use industry-standard terminology
- Present analysis suitable for investment committee review
- Maintain institutional credibility

### 3. User Privacy & Security
- Treat all financial data as confidential
- Never log sensitive report content
- Implement enterprise-grade authentication
- Follow financial industry security standards

### 4. Simplicity & Efficiency
- Minimize steps from upload to insight
- Optimize AI prompts for speed and cost
- Cache common queries where appropriate
- Design for daily professional use

### 5. Transparency
- Show consensus vs actual clearly
- Explain the logic chain for recommendations
- Identify assumptions in model impacts
- Acknowledge uncertainty and risks

## Development Philosophy

### Code Quality
- TypeScript strict mode always enabled
- Comprehensive error handling at API boundaries
- Database queries use parameterized statements
- Follow Next.js best practices

### User Experience
- Clean, distraction-free interface
- Financial professional aesthetic (not consumer app)
- Responsive design for laptop/desktop use
- Fast load times (<3 seconds)

### AI Integration
- Structured JSON output for reliability
- Temperature set conservatively (0.3)
- Fallback logic for API failures
- Cost monitoring and budget alerts

## Non-Goals

- We are NOT building:
  - A consumer-facing product
  - Real-time trading signals
  - Automated investment decisions
  - A replacement for human analysts

## Success Metrics

1. **Accuracy**: >95% consensus data matching SEC filings
2. **Speed**: <90 seconds from upload to complete analysis
3. **Adoption**: Used for >80% of quarterly earnings reviews
4. **Trust**: Zero security incidents, 100% data privacy compliance

## Roadmap Priorities

### Phase 1 (Current)
- [x] Core analysis pipeline
- [x] Basic authentication
- [x] Single report upload
- [x] Dashboard view

### Phase 2 (Next)
- [ ] Batch report processing
- [ ] Historical trend analysis
- [ ] Custom analysis templates
- [ ] Export to Excel/PDF

### Phase 3 (Future)
- [ ] Peer comparison analysis
- [ ] Earnings call transcript analysis
- [ ] Real-time SEC filing monitoring
- [ ] Team collaboration features

## Decision-Making Framework

When making architecture or feature decisions, ask:

1. **Does this serve professional fund managers?** (primary user)
2. **Does this improve analysis quality or speed?** (core value)
3. **Is this enterprise-grade secure?** (table stakes)
4. **Can we afford the ongoing cost?** (sustainability)
5. **Does this align with our core principles?** (consistency)

## Prohibited

- Storing passwords in plain text
- Exposing API keys in client code
- Making investment recommendations
- Processing personal consumer financial data
- Sharing user data across funds

## Technology Choices

### Why Next.js 14?
- Server Components reduce client JavaScript
- API Routes simplify backend logic
- Vercel deployment is seamless
- TypeScript support is first-class

### Why Neon Postgres?
- True serverless (scales to zero)
- PostgreSQL compatibility
- Excellent JSON support (JSONB)
- Vercel native integration

### Why OpenRouter + Gemini?
- Gemini 3 Pro offers best JSON schema support
- OpenRouter provides consistent API
- Easy to swap models if needed
- Cost-effective at scale

### Why Vercel?
- Zero-config deployment
- Automatic HTTPS and CDN
- Excellent DX with Git integration
- Mature platform with SLA

## Contribution Guidelines

1. **All PRs must pass TypeScript checks**
2. **Database migrations must be reversible**
3. **API changes require documentation update**
4. **UI changes need mobile responsiveness check**
5. **Security changes require peer review**

## Maintenance Commitment

- Security patches: Within 24 hours
- Bug fixes: Within 1 week
- Feature requests: Evaluated quarterly
- Dependencies: Updated monthly

---

This constitution guides all decisions and development for the Private Fund Analysis Platform.
