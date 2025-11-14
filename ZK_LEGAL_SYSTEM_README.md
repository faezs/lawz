# 🔐 Zero-Knowledge Legal System

**A Cypherpunk Hackathon Submission for Zcash**

> File legal documents in zero-knowledge. Pay law firms with Zcash. Powered by Aftok collaboration protocol.

## 🎯 Overview

The Zero-Knowledge Legal System revolutionizes legal document filing by combining:

- **Zero-Knowledge Proofs**: Prove legal compliance without revealing sensitive data
- **NADRA Authentication**: Biometric fingerprint login for Pakistani citizens
- **Zcash Settlement**: Private payment layer using Zashi wallet
- **Aftok Protocol**: Fair revenue distribution to law firms and contributors

### The Problem

Traditional legal document filing exposes sensitive financial and personal information:
- Tax returns reveal exact incomes
- Divorce settlements disclose detailed asset information
- Banks and courts require full financial disclosure
- Legal fees are opaque and centrally controlled

### Our Solution

With ZK Legal System:
1. **Citizens** authenticate via NADRA fingerprint
2. **Generate** zero-knowledge proofs of legal compliance
3. **File** documents without revealing sensitive details
4. **Pay** law firms privately via Zcash shielded transactions
5. **Distribute** revenue fairly using Aftok's time-based algorithm

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ZK Legal System                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐│
│  │   Frontend   │    │  ZK Circuits │    │    Aftok     ││
│  │  React + TS  │───▶│   Circom     │───▶│   Server     ││
│  └──────────────┘    └──────────────┘    └──────────────┘│
│         │                    │                    │        │
│         ▼                    ▼                    ▼        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐│
│  │    NADRA     │    │  snarkjs     │    │   Zcash      ││
│  │Fingerprint   │    │   Groth16    │    │  Testnet     ││
│  └──────────────┘    └──────────────┘    └──────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **TailwindCSS** for styling
- **Zustand** for state management
- **React Router** for navigation

#### Zero-Knowledge
- **Circom 2.0** for circuit design
- **snarkjs** for proof generation/verification
- **Groth16** proving system on BN128 curve

#### Blockchain
- **Zcash** for private payments
- **Zashi Wallet SDK** for wallet integration
- Testnet support for development

#### Backend (Aftok)
- **Haskell** server from nuttycom/aftok
- **PostgreSQL** for persistence
- **Snap Framework** for web services

#### Infrastructure
- **Nix** for reproducible builds
- **Docker** for deployment
- **GitHub Actions** for CI/CD

## 📋 Document Types

### 1. Tax Calculation 🧾

**Use Case**: File tax returns without revealing income

**Private Inputs**:
- Annual income
- Itemized deductions
- Filing status
- Number of dependents

**Public Outputs**:
- Tax owed (verified amount)
- Tax bracket
- Validity proof

**Integration**: Can use [Catala](https://catala-lang.org/) DSL for formalizing Pakistani tax law

### 2. Means Test 💰

**Use Case**: Prove financial eligibility for legal aid or divorce settlement

**Private Inputs**:
- Monthly income
- Monthly expenses
- Asset values
- Liability amounts
- Dependents

**Public Outputs**:
- Eligibility boolean
- Disposable income (range)
- Net worth (range)

**Applications**:
- Divorce settlement calculations
- Legal aid qualification
- Bankruptcy proceedings
- Child support determinations

### 3. Divorce Settlement (Planned)

**Use Case**: Calculate alimony/maintenance without full disclosure

### 4. Property Transfer (Planned)

**Use Case**: Verify property rights and transfer taxes

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Nix with flakes enabled
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/lawz.git
cd lawz

# Enter Nix development environment
nix develop .#zk-legal-ui

# Install frontend dependencies
cd zk-legal-ui
npm install

# Start development server
npm run dev
```

Visit `http://localhost:3000`

### Mock NADRA Authentication

For hackathon demo purposes:

1. Enter any CNIC in format: `12345-1234567-1`
2. Click "Capture Fingerprint" (mocks biometric scan)
3. Click "Login with NADRA"

In production, this would integrate with actual NADRA APIs.

### Zashi Wallet Setup

The app works with or without Zashi wallet:

- **With Zashi**: Install Zashi wallet extension and connect
- **Without Zashi**: Uses mock wallet with testnet addresses

For real Zcash testnet testing:
1. Install [Zashi Wallet](https://zashi.app)
2. Get testnet ZEC from faucet
3. Connect wallet in the app

## 🔧 Development

### Project Structure

```
lawz/
├── zk-legal-ui/              # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # Business logic
│   │   │   ├── nadraService.ts
│   │   │   ├── zcashService.ts
│   │   │   ├── zkProofService.ts
│   │   │   └── aftokService.ts
│   │   ├── types/            # TypeScript types
│   │   └── store/            # Zustand store
│   ├── public/circuits/      # Compiled ZK circuits
│   └── package.json
│
├── circuits/                 # Circom circuits
│   ├── tax_calculation/
│   │   └── tax_calculation.circom
│   ├── means_test/
│   │   └── means_test.circom
│   └── README.md
│
├── server/                   # Aftok Haskell server
├── lib/                      # Aftok libraries
├── client/                   # Aftok PureScript client
│
├── flake.nix                 # Nix configuration
├── docker-compose.yml        # Docker setup
└── README.md
```

### Building ZK Circuits

```bash
# Install circom
npm install -g circom

# Compile circuit
cd circuits/tax_calculation
circom tax_calculation.circom --r1cs --wasm --sym

# Run powers of tau ceremony (one-time)
snarkjs powersoftau new bn128 14 pot14_0000.ptau
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau
snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau

# Generate proving key
snarkjs groth16 setup tax_calculation.r1cs pot14_final.ptau tax_calculation_0000.zkey
snarkjs zkey contribute tax_calculation_0000.zkey tax_calculation_final.zkey
snarkjs zkey export verificationkey tax_calculation_final.zkey tax_calculation_vkey.json

# Copy to public directory
cp tax_calculation_js/tax_calculation.wasm ../../zk-legal-ui/public/circuits/
cp tax_calculation_final.zkey ../../zk-legal-ui/public/circuits/
cp tax_calculation_vkey.json ../../zk-legal-ui/public/circuits/
```

### Running Aftok Server

```bash
# Enter server shell
nix develop .#server

# Set up database
docker-compose up -d postgres
./scripts/init-db.sh

# Run server
cabal run aftok-server
```

## 🎮 Usage Demo

### Creating a Tax Document

1. **Login** with NADRA credentials (mock)
2. **Navigate** to "Create Document"
3. **Select** "Tax Calculation"
4. **Enter** your financial information:
   - Annual Income: 2,000,000 PKR
   - Filing Status: Married
   - Dependents: 2
5. **Generate** ZK Proof (takes ~3 seconds)
6. **Review** generated proof and public signals
7. **Select** a law firm
8. **Pay** 0.1 ZEC via Zashi wallet
9. **Submit** document

Your tax calculation is now filed! The law firm can verify the proof without seeing your actual income.

### Checking a Means Test

1. **Create Document** → **Means Test**
2. **Enter** financial details:
   - Monthly Income: 150,000 PKR
   - Monthly Expenses: 100,000 PKR
   - Dependents: 3
3. **Generate Proof**
4. System calculates eligibility **in zero-knowledge**
5. Outputs only: "Eligible: Yes" or "No"
6. Actual amounts remain private!

## 🔐 Security & Privacy

### Zero-Knowledge Guarantees

- **Private Inputs**: Never leave your browser
- **Encrypted Storage**: Documents encrypted client-side
- **ZK Proofs**: Mathematical guarantee of correctness
- **No Information Leakage**: Only yes/no or ranges revealed

### Zcash Privacy

- **Shielded Addresses**: All payments use z-addresses
- **Encrypted Memos**: Document IDs in transaction memos
- **Private Amounts**: Payment values hidden on-chain
- **Untraceable**: No public transaction graph

### NADRA Integration

- **Biometric Auth**: Fingerprint-based authentication
- **Government-Backed**: Uses national ID system
- **Secure Tokens**: ZK-friendly nullifiers generated
- **Production Ready**: Mock for demo, real APIs available

## 💡 Aftok Integration

### Why Aftok?

Traditional law firms have opaque billing and hierarchical structures. Aftok provides:

- **Fair Distribution**: Revenue split by time contributed
- **No Corporate Overhead**: Direct payment to contributors
- **Time Depreciation**: Recent work valued higher
- **Fork Mechanism**: Handle disputes democratically

### Revenue Flow

```
Client Payment (Zcash)
       │
       ▼
Law Firm Address
       │
       ▼
Aftok Distribution
   ┌───┴───┬────────┬────────┐
   ▼       ▼        ▼        ▼
Lawyer1 Lawyer2  Lawyer3  Lawyer4
(40%)   (30%)    (20%)    (10%)
```

Distribution calculated from time logs with depreciation.

### Time Tracking

```typescript
// Lawyer logs time spent on case
await aftokService.logTime({
  contributor: "lawyer_zcash_address",
  hours: 8,
  projectId: "case_12345"
});

// On payment, Aftok automatically distributes
await aftokService.distributePayment(
  projectId,
  totalAmount,
  zcashService
);
```

## 🌍 Real-World Applications

### Pakistan Legal System

- **Tax Filing**: FBR (Federal Board of Revenue) integration
- **Family Courts**: Divorce and custody cases
- **Banking**: Loan eligibility without full disclosure
- **Government Aid**: Welfare program qualification

### International Use Cases

- **US Tax System**: IRS filings with privacy
- **EU GDPR Compliance**: Minimal data disclosure
- **Immigration**: Prove financial stability
- **Charities**: Means-tested aid distribution

## 🔮 Future Roadmap

### Phase 1: MVP (Hackathon) ✅
- [x] NADRA mock authentication
- [x] Basic ZK circuits (tax, means test)
- [x] Zcash testnet integration
- [x] Aftok server integration
- [x] React UI

### Phase 2: Production
- [ ] Real NADRA API integration
- [ ] Mainnet Zcash deployment
- [ ] Multi-party computation ceremony for circuits
- [ ] Professional circuit audits
- [ ] Law firm onboarding

### Phase 3: Scale
- [ ] Additional document types
- [ ] Catala integration for tax law
- [ ] Mobile apps (iOS/Android)
- [ ] International law support
- [ ] Court system integration

### Phase 4: Innovation
- [ ] Recursive proofs for complex cases
- [ ] Cross-chain settlements (Bitcoin, Ethereum)
- [ ] AI-assisted legal document generation
- [ ] DAO governance for platform

## 🤝 Contributing

We welcome contributions! Areas of interest:

- **Circuit Development**: New legal document types
- **Catala Integration**: Formalize more laws
- **Security Audits**: Review ZK circuits
- **Law Firm Onboarding**: Partner with real firms
- **International Law**: Add support for other countries

## 📜 License

This project builds on [Aftok](https://github.com/nuttycom/aftok) by Kris Nuttycombe.

- Aftok components: Original license (see LICENSE)
- ZK Legal System additions: MIT License

## 👥 Team

Built for the Zcash Cypherpunks Hackathon

- Zero-Knowledge Legal System powered by Aftok
- Zcash for private settlement layer
- Circom/snarkjs for ZK proofs
- NADRA integration for Pakistani citizens

## 🔗 Links

- **Aftok**: https://github.com/nuttycom/aftok
- **Zcash**: https://z.cash
- **Zashi Wallet**: https://zashi.app
- **Circom**: https://docs.circom.io
- **Catala**: https://catala-lang.org
- **NADRA**: https://nadra.gov.pk

## 📞 Contact

For questions about this hackathon submission:
- Open an issue on GitHub
- Join Zcash Discord
- Follow development updates

---

**Built with 💜 for financial privacy and legal fairness**

*"Code is law, but law should be private"* - Cypherpunk Manifesto
