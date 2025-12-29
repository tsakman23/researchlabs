# ResearchLabs MVP

A collaborative research platform for teams to research, analyze, and synthesize information together in real-time.

## Tech Stack

- **Frontend**: Next.js 14 + React 19 + TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL + pgvector)
- **Real-time**: Supabase Realtime
- **Authentication**: Supabase Auth
- **Monorepo**: Turborepo + pnpm workspaces

## Project Structure

```
researchlabs/
├── apps/
│   └── web/              # Next.js application
├── packages/
│   ├── types/           # Shared TypeScript types
│   ├── utils/           # Shared utilities
│   └── ui/              # Shared UI components
├── turbo.json           # Turborepo configuration
├── pnpm-workspace.yaml  # pnpm workspace configuration
└── package.json         # Root package.json
```

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm (install with: `npm install -g pnpm`)
- Docker Desktop (for Supabase local)

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd researchlabs
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your configuration
```

4. Start Supabase locally:
```bash
# Install Supabase CLI (if not already installed)
# Windows: scoop install supabase
# Mac: brew install supabase/tap/supabase
# Linux: Download from GitHub releases

supabase start
```

5. Run the development server:
```bash
pnpm dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

### Available Scripts

- `pnpm dev` - Start development server for all apps
- `pnpm build` - Build all apps and packages
- `pnpm lint` - Lint all code
- `pnpm test` - Run tests across all packages
- `pnpm clean` - Clean build artifacts

### Testing

- Unit tests: `pnpm test`
- E2E tests: `pnpm test:e2e` (Playwright)

## Features (MVP)

- ✅ Project setup & infrastructure
- [ ] Authentication (Supabase Auth)
- [ ] Workspace management
- [ ] Document upload & storage
- [ ] Claim extraction
- [ ] Claims management UI
- [ ] Collaborative text editor
- [ ] Chat interface
- [ ] Search functionality
- [ ] Unit & integration tests
- [ ] E2E tests

## Contributing

See [PROGRESS.md](./PROGRESS.md) for current development status and roadmap.

## License

MIT
