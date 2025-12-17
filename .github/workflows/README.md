# GitHub Actions Workflows

This directory contains CI/CD workflows for the Raast FHE+ZK Integration project.

## Workflows Overview

### 1. Main CI/CD Pipeline (`ci-cd.yml`)

**Triggers**: Push to main/develop/claude/** branches, Pull Requests

**Jobs**:
- **lint-and-typecheck**: ESLint and TypeScript type checking
- **test-frontend**: React/TypeScript tests and build
- **build-backend-nix**: Build Haskell backend with Nix
- **compile-circuits**: Compile Circom ZK circuits
- **integration-tests**: End-to-end tests with PostgreSQL
- **security-scan**: Trivy vulnerability scanning and npm audit
- **build-and-push-docker**: Build and push Docker images (main branch only)
- **deploy-staging**: Deploy to staging environment (develop branch)
- **performance-tests**: Lighthouse CI performance testing
- **generate-docs**: Generate and deploy API documentation
- **notify**: Send Slack notifications

**Required Secrets**:
- `CACHIX_AUTH_TOKEN`: Cachix authentication token
- `DOCKER_USERNAME`: Docker Hub username
- `DOCKER_PASSWORD`: Docker Hub password
- `SLACK_WEBHOOK`: Slack webhook URL for notifications

### 2. Nix Build (`nix-build.yml`)

**Triggers**: Push to main/claude/** branches, Pull Requests

**Jobs**:
- **nix-build**: Build Haskell packages and Docker images with Nix
- **nix-develop-shells**: Test development shells
- **nix-flake-update**: Automated flake input updates (scheduled)

**Matrix Strategy**:
- Builds multiple targets: `aftok`, `aftok-server-dockerImage`
- Tests multiple dev shells: `client`, `zk-legal-ui`

**Required Secrets**:
- `CACHIX_AUTH_TOKEN`: Cachix authentication token

### 3. ZK Circuits Testing (`zk-circuits.yml`)

**Triggers**: Push/PR affecting `circuits/**`

**Jobs**:
- **compile-circuits**: Compile Circom circuits and generate proofs
  - Installs Circom and snarkjs
  - Compiles `raast_payment.circom`
  - Generates circuit statistics
  - Downloads Powers of Tau
  - Generates proving and verification keys
  - Creates test witness
  - Generates and verifies Groth16 proof
  - Exports Solidity verifier contract
  - Comments on PR with circuit stats

- **benchmark-circuits**: Performance benchmarking
  - Benchmarks proof generation (10 iterations)
  - Benchmarks proof verification (100 iterations)
  - Reports average times

**Artifacts**:
- R1CS constraint system
- WebAssembly witness calculator
- Groth16 proving keys
- Verification keys
- Solidity verifier contract
- Circuit statistics

### 4. Release (`release.yml`)

**Triggers**: Push to tags matching `v*.*.*`

**Jobs**:
- **create-release**: Create GitHub release with changelog
- **build-release-artifacts**: Build and upload release artifacts
- **publish-docker-images**: Publish to GitHub Container Registry
- **publish-npm-package**: Publish frontend to NPM (disabled by default)
- **deploy-production**: Deploy to production environment

**Tag Format**: `v1.0.0`, `v2.1.3`, etc.

**Required Secrets**:
- `CACHIX_AUTH_TOKEN`: Cachix authentication token
- `NPM_TOKEN`: NPM authentication token (if publishing)
- `SLACK_WEBHOOK`: Slack webhook for deployment notifications

## Setup Instructions

### 1. Configure Secrets

Go to **Settings → Secrets and variables → Actions** and add:

```bash
# Cachix (for Nix binary cache)
CACHIX_AUTH_TOKEN=<your-cachix-token>

# Docker Hub (optional, if pushing to Docker Hub)
DOCKER_USERNAME=<your-docker-username>
DOCKER_PASSWORD=<your-docker-password>

# Slack (for notifications)
SLACK_WEBHOOK=<your-slack-webhook-url>

# NPM (for publishing frontend package)
NPM_TOKEN=<your-npm-token>
```

### 2. Set Up Cachix

```bash
# Install cachix
nix-env -iA cachix -f https://cachix.org/api/v1/install

# Create cache
cachix create aftok

# Generate auth token
cachix authtoken
```

### 3. Enable GitHub Container Registry

Ensure your repository has permissions to publish to GHCR:
- Go to **Settings → Actions → General**
- Under **Workflow permissions**, select **Read and write permissions**

### 4. Configure Branch Protection

For `main` branch:
- **Settings → Branches → Add rule**
- Require status checks to pass:
  - `lint-and-typecheck`
  - `test-frontend`
  - `build-backend-nix`
  - `compile-circuits`
  - `integration-tests`

## Running Workflows Locally

### Using Act

```bash
# Install act
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash  # Linux

# Run all workflows
act

# Run specific workflow
act -W .github/workflows/ci-cd.yml

# Run specific job
act -j test-frontend
```

### Manual Testing

```bash
# Test Nix build
nix build .#aftok
nix build .#aftok-server-dockerImage

# Test dev shells
nix develop .#zk-legal-ui
nix develop .#server

# Test frontend
cd zk-legal-ui
npm install
npm run lint
npm run build
npm test

# Test ZK circuits
cd circuits/raast_payment
circom raast_payment.circom --r1cs --wasm --sym
snarkjs r1cs info raast_payment.r1cs
```

## Workflow Status Badges

Add to your README.md:

```markdown
![CI/CD](https://github.com/faezs/lawz/actions/workflows/ci-cd.yml/badge.svg)
![Nix Build](https://github.com/faezs/lawz/actions/workflows/nix-build.yml/badge.svg)
![ZK Circuits](https://github.com/faezs/lawz/actions/workflows/zk-circuits.yml/badge.svg)
```

## Troubleshooting

### Nix Build Fails

```bash
# Check flake
nix flake check --show-trace

# Update flake inputs
nix flake update

# Clear cache
rm -rf ~/.cache/nix
```

### Circuit Compilation Fails

```bash
# Check Circom installation
circom --version

# Test compilation manually
cd circuits/raast_payment
circom raast_payment.circom --r1cs --wasm --sym --c
```

### Docker Build Fails

```bash
# Test locally
nix build .#aftok-server-dockerImage
docker load < result
docker run -it aftok/aftok-server:latest
```

### Integration Tests Fail

```bash
# Check PostgreSQL connection
docker-compose up -d aftokdb
psql -h localhost -p 15432 -U aftok -d aftok

# Run migrations
psql -h localhost -p 15432 -U aftok -d aftok -f migrations/2025-11-25_16-49-36_raast-fhe-support.txt
```

## Performance Optimization

### Caching Strategies

1. **Nix**: Uses Cachix for binary cache
2. **NPM**: GitHub Actions cache for `node_modules`
3. **Circom**: Caches compiled binaries
4. **Docker**: Uses layer caching

### Parallel Execution

- Frontend and backend build in parallel
- Multiple Nix targets built using matrix strategy
- Circuit compilation and testing run independently

### Resource Limits

- Default runner: `ubuntu-latest` (2 cores, 7GB RAM)
- Can upgrade to `ubuntu-latest-4-cores` if needed
- Consider self-hosted runners for faster builds

## Maintenance

### Regular Updates

- **Weekly**: Dependabot updates dependencies
- **Monthly**: Review and update workflow versions
- **Quarterly**: Review and optimize caching strategies

### Monitoring

- Check workflow run times in **Actions** tab
- Monitor artifact sizes
- Review security scan results
- Track deployment success rates

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Nix Flakes](https://nixos.wiki/wiki/Flakes)
- [Cachix](https://docs.cachix.org/)
- [Circom](https://docs.circom.io/)
- [snarkjs](https://github.com/iden3/snarkjs)
