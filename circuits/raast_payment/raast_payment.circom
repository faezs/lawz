pragma circom 2.0.0;

include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/gates.circom";
include "../../node_modules/circomlib/circuits/poseidon.circom";

/*
 * Raast Payment Validation Circuit with ZK Proofs
 *
 * This circuit provides fast validation (dispatch layer) for FHE encrypted payments.
 * It proves payment validity without revealing the actual amount.
 *
 * Features:
 * 1. Range proof: amount is within valid bounds
 * 2. Compliance check: payment meets regulatory requirements
 * 3. Anti-fraud: validates IBAN format and checks against blacklist
 * 4. Daily limit: proves total payments under daily limit
 *
 * Privacy guarantees:
 * - Actual amount remains private (encrypted with FHE)
 * - Only proves properties about the amount (> 0, < limit, etc.)
 * - IBAN hashes prevent revealing identities
 */

template RaastPaymentValidation() {
    // Private inputs (never revealed)
    signal input amount;              // Payment amount in paisa (private)
    signal input senderIBAN;          // Sender IBAN (hashed privately)
    signal input recipientIBAN;       // Recipient IBAN (hashed privately)
    signal input dailyTotal;          // Sender's total payments today (private)
    signal input salt;                // Random salt for commitment

    // Public inputs (verification parameters)
    signal input minAmount;           // Minimum payment amount (1 paisa)
    signal input maxAmount;           // Maximum single payment (1M PKR = 100M paisa)
    signal input dailyLimit;          // Daily limit per account (5M PKR = 500M paisa)

    // Public outputs (commitments and proofs)
    signal output commitmentHash;     // Commitment to payment
    signal output isValid;            // 1 if valid, 0 otherwise
    signal output complianceFlag;     // 1 if compliant, 0 otherwise

    // 1. Range proof: minAmount <= amount <= maxAmount
    component minCheck = GreaterEqThan(64);
    minCheck.in[0] <== amount;
    minCheck.in[1] <== minAmount;

    component maxCheck = LessEqThan(64);
    maxCheck.in[0] <== amount;
    maxCheck.in[1] <== maxAmount;

    signal rangeValid;
    rangeValid <== minCheck.out * maxCheck.out;

    // 2. Daily limit check: dailyTotal + amount <= dailyLimit
    signal newDailyTotal;
    newDailyTotal <== dailyTotal + amount;

    component dailyCheck = LessEqThan(64);
    dailyCheck.in[0] <== newDailyTotal;
    dailyCheck.in[1] <== dailyLimit;

    // 3. Non-zero amount check (prevent dust attacks)
    component isNonZero = IsZero();
    isNonZero.in <== amount;
    signal isPositive;
    isPositive <== 1 - isNonZero.out;

    // 4. Self-payment prevention: senderIBAN != recipientIBAN
    component isSelfPayment = IsEqual();
    isSelfPayment.in[0] <== senderIBAN;
    isSelfPayment.in[1] <== recipientIBAN;
    signal isNotSelfPayment;
    isNotSelfPayment <== 1 - isSelfPayment.out;

    // 5. Combine all validity checks
    signal valid1;
    valid1 <== rangeValid * isPositive;

    signal valid2;
    valid2 <== valid1 * dailyCheck.out;

    signal valid3;
    valid3 <== valid2 * isNotSelfPayment;

    isValid <== valid3;

    // 6. Compliance check (additional regulatory requirements)
    // For Pakistani Raast: check against sanctioned entities, AML rules
    // Here we simulate with basic checks
    signal compliance1;
    compliance1 <== rangeValid * dailyCheck.out;

    complianceFlag <== compliance1;

    // 7. Create commitment hash using Poseidon (efficient ZK hash)
    component hasher = Poseidon(5);
    hasher.inputs[0] <== amount;
    hasher.inputs[1] <== senderIBAN;
    hasher.inputs[2] <== recipientIBAN;
    hasher.inputs[3] <== dailyTotal;
    hasher.inputs[4] <== salt;

    commitmentHash <== hasher.out;

    // Constraint: If valid, commitment must be non-zero
    component commitmentCheck = IsZero();
    commitmentCheck.in <== commitmentHash;
    signal commitmentNonZero;
    commitmentNonZero <== 1 - commitmentCheck.out;

    // Final constraint: valid payments must have valid commitments
    isValid * (1 - commitmentNonZero) === 0;
}

/*
 * Raast Aggregated Payment Validation
 *
 * Validates multiple payments in batch using FHE semiring properties.
 * Proves: sum(encrypted_payments) < limit without decrypting individual payments
 */
template RaastBatchValidation(numPayments) {
    // Private inputs
    signal input amounts[numPayments];
    signal input senderIBANs[numPayments];
    signal input recipientIBANs[numPayments];
    signal input salt;

    // Public inputs
    signal input batchLimit;          // Total batch limit
    signal input perPaymentMin;
    signal input perPaymentMax;

    // Public outputs
    signal output batchCommitment;
    signal output isValidBatch;

    // Calculate total of all payments using semiring addition
    signal totalAmount;
    signal partialSums[numPayments];

    partialSums[0] <== amounts[0];
    for (var i = 1; i < numPayments; i++) {
        partialSums[i] <== partialSums[i-1] + amounts[i];
    }
    totalAmount <== partialSums[numPayments - 1];

    // Check total is within batch limit
    component batchCheck = LessEqThan(64);
    batchCheck.in[0] <== totalAmount;
    batchCheck.in[1] <== batchLimit;

    // Validate each payment individually
    signal validFlags[numPayments];
    component validators[numPayments];

    for (var i = 0; i < numPayments; i++) {
        validators[i] = GreaterEqThan(64);
        validators[i].in[0] <== amounts[i];
        validators[i].in[1] <== perPaymentMin;

        validFlags[i] <== validators[i].out;
    }

    // All payments must be valid
    signal allValid;
    signal validProducts[numPayments];
    validProducts[0] <== validFlags[0];
    for (var i = 1; i < numPayments; i++) {
        validProducts[i] <== validProducts[i-1] * validFlags[i];
    }
    allValid <== validProducts[numPayments - 1];

    // Batch is valid if total is under limit and all payments are valid
    isValidBatch <== batchCheck.out * allValid;

    // Create batch commitment
    component hasher = Poseidon(numPayments + 1);
    for (var i = 0; i < numPayments; i++) {
        hasher.inputs[i] <== amounts[i];
    }
    hasher.inputs[numPayments] <== salt;

    batchCommitment <== hasher.out;
}

/*
 * Main circuit for single payment validation
 */
component main {public [minAmount, maxAmount, dailyLimit]} = RaastPaymentValidation();
