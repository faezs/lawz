# Zero-Knowledge Circuits for Legal Documents

This directory contains the zero-knowledge circuits used in the ZK Legal System.

## Circuits Overview

### 1. Tax Calculation Circuit (`tax_calculation/`)

**Purpose**: Prove that a tax calculation is correct without revealing actual income or deductions.

**Inputs**:
- Private: `income`, `deductions[]`, `filingStatus`, `dependents`
- Public: `taxOwed`, `taxBracket`

**Circuit Logic**:
```
1. Verify income is positive
2. Apply deductions
3. Calculate taxable income
4. Apply tax brackets based on filing status
5. Apply dependent credits
6. Output final tax owed
```

**Files**:
- `tax_calculation.circom` - Main circuit definition
- `tax_calculation.wasm` - Compiled WASM
- `tax_calculation.zkey` - Proving key (generated from ceremony)
- `tax_calculation_vkey.json` - Verification key

### 2. Means Test Circuit (`means_test/`)

**Purpose**: Prove financial eligibility for legal aid or divorce settlement without revealing exact amounts.

**Inputs**:
- Private: `monthlyIncome`, `monthlyExpenses`, `assets[]`, `liabilities[]`
- Public: `isEligible`, `eligibilityThreshold`

**Circuit Logic**:
```
1. Calculate net monthly income
2. Sum total assets
3. Sum total liabilities
4. Calculate net worth
5. Apply means test formula
6. Output eligibility boolean
```

**Files**:
- `means_test.circom` - Main circuit definition
- `means_test.wasm` - Compiled WASM
- `means_test.zkey` - Proving key
- `means_test_vkey.json` - Verification key

## Building Circuits

### Prerequisites

```bash
npm install -g circom
npm install -g snarkjs
```

### Compilation Steps

1. **Compile Circuit to R1CS**:
```bash
circom tax_calculation/tax_calculation.circom --r1cs --wasm --sym
```

2. **Generate Witness**:
```bash
node tax_calculation/generate_witness.js tax_calculation/input.json
```

3. **Powers of Tau Ceremony** (one-time setup):
```bash
snarkjs powersoftau new bn128 14 pot14_0000.ptau
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First contribution"
snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau
```

4. **Generate Proving Key**:
```bash
snarkjs groth16 setup tax_calculation.r1cs pot14_final.ptau tax_calculation_0000.zkey
snarkjs zkey contribute tax_calculation_0000.zkey tax_calculation_final.zkey --name="Contribution"
snarkjs zkey export verificationkey tax_calculation_final.zkey tax_calculation_vkey.json
```

5. **Export to WASM and Move Files**:
```bash
cp tax_calculation_js/tax_calculation.wasm ../zk-legal-ui/public/circuits/
cp tax_calculation_final.zkey ../zk-legal-ui/public/circuits/tax_calculation.zkey
cp tax_calculation_vkey.json ../zk-legal-ui/public/circuits/
```

## Circuit Security

### Trusted Setup

For production, a multi-party computation (MPC) ceremony should be conducted:
- Minimum 10 participants recommended
- At least one honest participant required for security
- Use secure randomness for tau generation

### Circuit Audits

Before production deployment:
1. Formal verification of circuit constraints
2. Security audit by ZK experts
3. Testing with edge cases and boundary conditions
4. Gas optimization for on-chain verification

## Integration with Catala

The tax calculation circuit can integrate with Catala (domain-specific language for law):

```catala
scope TaxCalculation:
  context income content money
  context deductions content money list
  context filing_status content FilingStatus

  definition taxable_income equals
    income - sum of deductions

  definition tax_owed equals
    apply_brackets taxable_income filing_status
```

The Catala formalization can be compiled to the circuit constraints, ensuring legal compliance.

## Future Circuits

### Planned Additions

1. **Divorce Settlement Circuit**
   - Asset division calculations
   - Alimony/maintenance computations
   - Child support formulas

2. **Property Transfer Circuit**
   - Title verification
   - Transfer tax calculations
   - Encumbrance checks

3. **Financial Disclosure Circuit**
   - Income verification
   - Asset valuation
   - Liability attestation

## Testing

Run circuit tests:
```bash
npm test
```

Generate test vectors:
```bash
node scripts/generate_test_vectors.js
```

## Resources

- [Circom Documentation](https://docs.circom.io/)
- [snarkjs Guide](https://github.com/iden3/snarkjs)
- [Catala Language](https://catala-lang.org/)
- [Groth16 Paper](https://eprint.iacr.org/2016/260.pdf)
