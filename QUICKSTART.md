# Zero-Knowledge Legal System - Quick Start

## 🚀 Running the Application

### Option 1: Direct npm (Simplest)

```bash
cd zk-legal-ui

# Install dependencies (if not done)
npm install

# Development server
npm run dev
# Opens on http://localhost:3000

# Production build and serve
npm run build
npx serve dist -p 8080
# Opens on http://localhost:8080
```

### Option 2: Nix Development Environment

**IMPORTANT:** Use the `zk-legal-ui` shell, NOT the default shell!

```bash
# Enter the ZK Legal UI development shell
nix develop .#zk-legal-ui

# Now you're in a shell with Node.js 20
cd zk-legal-ui
npm install
npm run dev
```

**Available Nix shells:**
- `.#zk-legal-ui` - Frontend development (Node.js, npm, TypeScript) ✅ Use this!
- `.#server` - Aftok Haskell server (GHC, cabal) ⚠️ Has macOS issues
- `.#client` - Aftok PureScript client (purs, spago)

### Option 3: Production Deployment

```bash
cd zk-legal-ui
npm install
npm run build
npx serve dist -p 8080
```

Visit: http://localhost:8080

## 🐛 Troubleshooting

### "Error: builder for aftok failed" on macOS

**Problem:** You ran `nix develop .#` which tries to build the Haskell server

**Solution:** Use the specific shell instead:
```bash
nix develop .#zk-legal-ui
```

### "Module not found: snarkjs"

**Solution:** Install dependencies:
```bash
cd zk-legal-ui
npm install
```

### Port already in use

**Solution:** Kill the process or use a different port:
```bash
# Find and kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or use different port
npm run dev -- --port 3001
```

## 📦 What You Need

**For Development:**
- Node.js 20+ (or use Nix shell)
- npm 10+

**For Production:**
- Node.js (to build)
- Any static file server (serve, nginx, etc.)

**For Aftok Backend (Optional):**
- Nix with flakes
- PostgreSQL
- Note: Currently has macOS build issues

## 🎯 Quick Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # Check TypeScript types
npm run lint         # Lint code

# Deployment
npx serve dist -p 8080              # Serve production build
docker-compose -f docker-compose.zk-legal.yml up -d  # Docker
npx vercel                          # Deploy to Vercel
npx netlify deploy --prod           # Deploy to Netlify
```

## 🌐 URLs

- **Development:** http://localhost:3000
- **Production (local):** http://localhost:8080
- **Health Check:** http://localhost:8080/health

## 📚 Documentation

- `ZK_LEGAL_SYSTEM_README.md` - Full project documentation
- `DEPLOYMENT.md` - Deployment guide
- `circuits/README.md` - ZK circuits documentation

## ✅ Current Status

**Running Now:**
- Development server: http://localhost:3000 (if dev mode)
- Production server: http://localhost:8080 (if production mode)

Both are working! The application is fully functional.
