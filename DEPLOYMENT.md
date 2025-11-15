# Zero-Knowledge Legal System - Deployment Guide

This guide covers multiple deployment options for the ZK Legal System.

## 🚀 Quick Deploy (Current - Running Now!)

**Production server is running on:** **http://localhost:8080**

The application is built and deployed using:
```bash
cd zk-legal-ui
npm run build
npx serve dist -p 8080
```

## 📦 Deployment Options

### Option 1: Static File Serving (Simplest)

**Requirements:** Node.js only

```bash
# Build the application
cd zk-legal-ui
npm install
npm run build

# Serve with any static file server
npx serve dist -p 8080

# OR use Python
python3 -m http.server 8080 -d dist

# OR use PHP
php -S localhost:8080 -t dist
```

**Pros:**
- Simplest deployment
- No Docker required
- Works anywhere Node.js is installed

**Cons:**
- No process management
- Manual restarts required

---

### Option 2: Docker Deployment (Recommended)

**Requirements:** Docker

```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.zk-legal.yml up -d

# Access at http://localhost:8080
```

**What's included:**
- Production-optimized build (multi-stage)
- Nginx web server
- PostgreSQL database (for Aftok backend)
- Health checks
- Auto-restart on failure

**Dockerfile highlights:**
- Multi-stage build (smaller image)
- Alpine Linux base (minimal size)
- Nginx for production serving
- Gzip compression enabled
- Security headers configured

---

### Option 3: Nix Flake Deployment

**Requirements:** Nix with flakes

```bash
# Enter development environment
nix develop .#zk-legal-ui

# Build
cd zk-legal-ui
npm install
npm run build

# Serve
npx serve dist -p 8080
```

**For production Nix deployment:**

```bash
# Build with Nix
nix build .#zk-legal-ui

# Run the result
./result/bin/serve
```

**Pros:**
- Reproducible builds
- All dependencies pinned
- Works across platforms
- Declarative configuration

---

### Option 4: Cloud Deployment

#### Vercel (Easiest)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd zk-legal-ui
vercel
```

#### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
cd zk-legal-ui
netlify deploy --prod
```

#### AWS S3 + CloudFront

```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name

# Configure CloudFront distribution
```

#### DigitalOcean App Platform

1. Connect GitHub repository
2. Set build command: `cd zk-legal-ui && npm install && npm run build`
3. Set output directory: `zk-legal-ui/dist`
4. Deploy!

---

## 🔧 Production Configuration

### Environment Variables

Create `.env.production` in `zk-legal-ui/`:

```env
VITE_AFTOK_API_ENDPOINT=https://your-api.example.com/api
VITE_NADRA_API_ENDPOINT=https://nadra-api.example.com/api
VITE_ZCASH_NETWORK=mainnet
VITE_ZASHI_API_ENDPOINT=https://api.zashi.app
VITE_ENABLE_REAL_NADRA=true
VITE_ENABLE_MAINNET=true
VITE_DEBUG_MODE=false
VITE_MOCK_WALLET=false
VITE_MOCK_FINGERPRINT=false
```

### Build Optimization

The production build includes:
- ✅ Code splitting
- ✅ Tree shaking
- ✅ Minification
- ✅ CSS optimization
- ✅ Gzip compression ready
- ✅ Source maps (for debugging)

**Bundle sizes:**
- JavaScript: ~207KB (64KB gzipped)
- CSS: ~21KB (4.4KB gzipped)
- Total: ~228KB (~68KB gzipped)

---

## 🗄️ Backend Deployment (Aftok Server)

The Aftok Haskell server can be deployed separately:

### Docker Deployment

```bash
# Start PostgreSQL
docker-compose -f docker-compose.zk-legal.yml up -d postgres

# Build and run Aftok server (when implemented)
# nix build .#aftok
# docker run -p 8000:8000 aftok-server
```

### Nix Deployment

```bash
# Build Aftok server
nix build .#aftok

# Run
./result/bin/aftok-server --conf=/etc/aftok/aftok-server.cfg
```

---

## 🔐 Security Considerations

### Production Checklist

- [ ] Use HTTPS (Let's Encrypt or CloudFlare)
- [ ] Enable security headers (already in nginx.conf)
- [ ] Set up CORS properly
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Set up monitoring/logging
- [ ] Configure CSP headers
- [ ] Enable HSTS

### Nginx Security Headers

Already included in `nginx.conf`:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

---

## 📊 Performance Optimization

### Already Implemented

1. **Vite Build Optimizations**
   - Code splitting by route
   - Lazy loading components
   - Tree shaking unused code

2. **Nginx Optimizations**
   - Gzip compression
   - Static asset caching (1 year)
   - Connection keep-alive

3. **React Optimizations**
   - Zustand for efficient state management
   - Route-based code splitting
   - Optimized re-renders

### Additional Recommendations

```nginx
# Add to nginx.conf for better performance
http2 on;
client_max_body_size 10M;
keepalive_timeout 65;
```

---

## 🎯 Deployment URLs

Once deployed, the application will be available at:

**Current (Local):**
- http://localhost:8080

**Production Examples:**
- https://zk-legal.vercel.app
- https://zk-legal.netlify.app
- https://zk.yourdomain.com

---

## 🐛 Troubleshooting

### Build fails with TypeScript errors

```bash
# Check types without building
npm run type-check

# Fix and rebuild
npm run build
```

### Docker build fails

```bash
# Clean and rebuild
docker-compose -f docker-compose.zk-legal.yml down -v
docker-compose -f docker-compose.zk-legal.yml build --no-cache
docker-compose -f docker-compose.zk-legal.yml up -d
```

### Port already in use

```bash
# Find process on port 8080
lsof -i :8080

# Kill it
kill -9 <PID>

# Or use different port
npx serve dist -p 8081
```

---

## 📈 Scaling

For high-traffic production:

1. **Load Balancing**: Deploy multiple instances behind nginx/HAProxy
2. **CDN**: Use CloudFlare or CloudFront for static assets
3. **Database**: Use managed PostgreSQL (AWS RDS, DigitalOcean)
4. **Caching**: Add Redis for session/proof caching
5. **Monitoring**: Set up Prometheus + Grafana

---

## 🔄 CI/CD

### GitHub Actions Example

```yaml
name: Deploy ZK Legal System

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install and Build
        run: |
          cd zk-legal-ui
          npm ci
          npm run build

      - name: Deploy to Vercel
        run: npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 📞 Support

For deployment issues:
- Check logs: `docker-compose logs -f`
- Review nginx logs: `/var/log/nginx/error.log`
- Check health: `curl http://localhost:8080/health`

---

**Built with ❤️ for the Zcash Cypherpunks Hackathon**

Zero-Knowledge Privacy + Aftok Collaboration + Zcash Settlement = The Future of Legal Systems
