# Private Fund Analysis Platform

Enterprise-grade financial report analysis platform for private equity funds, powered by AI.

## 🚀 Features

- **AI-Powered Analysis**: Leverages Gemini 3 Pro via OpenRouter for comprehensive financial report analysis
- **Multi-Format Support**: Upload PDF, Excel, or text documents
- **Structured Output**: Analysis follows sell-side analyst format with:
  - Executive summary & one-line conclusion
  - Results vs market expectations
  - Key growth drivers (demand, monetization, efficiency)
  - Investment ROI analysis
  - Sustainability & risk assessment
  - Model impact & recommendations
- **Enterprise Security**: JWT-based authentication, role-based access control
- **Cloud-Native**: Built for Vercel deployment with Neon Postgres
- **Beautiful UI**: Clean, professional interface optimized for financial professionals
- **Bilingual**: Full English and Chinese support

## 📋 Prerequisites

- Node.js 18.17.0 or higher
- A Vercel account
- An OpenRouter API key ([Get one here](https://openrouter.ai/keys))

## 🛠️ Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/private-fund-analysis.git
cd private-fund-analysis
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the template and fill in your values:

```bash
cp .env.local.template .env.local
```

Edit `.env.local` with your credentials:

```env
# Database (Get from Vercel after deployment)
DATABASE_URL="postgresql://..."

# OpenRouter API (Get from https://openrouter.ai/keys)
OPENROUTER_API_KEY="sk-or-v1-..."

# NextAuth
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# Vercel Blob (Get from Vercel after deployment)
BLOB_READ_WRITE_TOKEN="vercel_blob_..."

# JWT
JWT_SECRET="your-jwt-secret"
```

### 4. Run database migrations

After setting up your database, run:

```bash
npm run db:migrate
```

### 5. Start development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🚢 Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Import to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js configuration

### 3. Add Neon Postgres

1. In Vercel project settings, go to "Storage"
2. Click "Create Database" → Select "Neon Postgres"
3. This automatically sets `DATABASE_URL` environment variable

### 4. Add Blob Storage

1. In Vercel project settings, go to "Storage"
2. Click "Create Store" → Select "Blob"
3. This automatically sets `BLOB_READ_WRITE_TOKEN`

### 5. Configure Environment Variables

In Vercel project settings → "Environment Variables", add:

```
OPENROUTER_API_KEY=sk-or-v1-...
NEXTAUTH_SECRET=(generate with: openssl rand -base64 32)
NEXTAUTH_URL=https://your-domain.vercel.app
JWT_SECRET=(generate with: openssl rand -base64 32)
```

### 6. Run Database Migration

After first deployment, use Vercel CLI to run migrations:

```bash
vercel env pull .env.local
npm run db:migrate
```

### 7. Deploy

```bash
git push origin main
```

Vercel will automatically deploy on every push to main.

## 📖 Usage

### Default Login Credentials

```
Email: admin@example.com
Password: admin123
```

**⚠️ IMPORTANT**: Change the default password immediately in production!

### Uploading a Report

1. Click "Upload Report" button
2. Fill in company information:
   - Company name (e.g., "Apple Inc.")
   - Stock symbol (e.g., "AAPL")
   - Report type (10-Q, 10-K, 8-K)
   - Fiscal year and quarter
   - Filing date
3. (Optional) Add market consensus data
4. Upload the financial report document
5. Click "Upload & Analyze"

The system will:
- Extract text from the document
- Send to Gemini 3 Pro for analysis
- Generate structured insights
- Store results in database

### Viewing Analysis

- Click on any analyzed report in the list
- Review the comprehensive analysis including:
  - Beat/miss vs consensus
  - Driver decomposition
  - Investment ROI
  - Risk factors
  - Model recommendations

## 🏗️ Architecture

```
Next.js 14 (App Router)
├── Frontend: React + TypeScript + Tailwind CSS
├── Backend: Next.js API Routes
├── Database: Neon Postgres (Serverless)
├── Storage: Vercel Blob
├── AI: Gemini 3 Pro (via OpenRouter)
└── Auth: NextAuth.js + JWT
```

## 📁 Project Structure

```
private-fund-analysis/
├── .specify/              # GitHub Spec Kit compliance
├── app/                   # Next.js App Router
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   └── dashboard/        # Main application
├── components/            # React components
│   ├── ui/               # UI primitives
│   └── dashboard/        # Feature components
├── lib/                   # Utilities
│   ├── ai/               # AI integration
│   ├── auth.ts           # Authentication config
│   ├── db/               # Database queries
│   └── document-parser.ts # Document extraction
└── infrastructure/        # External integrations
```

## 🔒 Security Features

- JWT session management (30-minute timeout)
- Role-based access control (analyst, manager, admin)
- Secure password hashing with bcrypt
- Environment variable protection
- SQL injection prevention (parameterized queries)
- HTTPS-only in production

## 💰 Cost Estimate

For 1,000 active users/month:

- Vercel Pro: $20/month
- Neon Postgres (2GB): $19/month
- Vercel Blob (10GB): $0.23/month
- OpenRouter API (100K tokens): ~$50/month

**Total: ~$89/month**

## 🤝 Contributing

This project follows [GitHub Spec Kit](https://github.com/github/spec-kit) conventions.

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues or questions:
1. Check the [GitHub Issues](https://github.com/YOUR_USERNAME/private-fund-analysis/issues)
2. Consult OpenRouter documentation: https://openrouter.ai/docs
3. Vercel deployment guide: https://vercel.com/docs

## 🔗 Links

- [Live Demo](https://your-domain.vercel.app)
- [OpenRouter API](https://openrouter.ai)
- [Neon Postgres](https://neon.tech)
- [Vercel Platform](https://vercel.com)

---

Built with ❤️ for private equity professionals
