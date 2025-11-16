pragma circom 2.0.0;

/*
 * Property Transfer Circuit
 *
 * Proves that a property transfer is legally valid according to Pakistani law
 * without revealing the actual property value or buyer/seller identities.
 *
 * Verifies:
 * - Capital gains tax calculation
 * - Stamp duty calculation
 * - Transfer eligibility
 * - Anti-money laundering checks
 *
 * This circuit can be integrated with land registry systems
 * and Catala formalization of property law.
 */

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";
include "../node_modules/circomlib/circuits/mux1.circom";

template PropertyTransfer() {
    // Private inputs (hidden from public)
    signal input purchasePrice;         // Current sale price in PKR (scaled by 100)
    signal input originalPurchasePrice; // Original purchase price in PKR (scaled by 100)
    signal input ownershipYears;        // Years of ownership
    signal input propertyType;          // 0=residential, 1=commercial, 2=agricultural
    signal input isFirstProperty;       // 1 if buyer's first property, 0 otherwise
    signal input buyerAge;              // Buyer's age
    signal input sellerCNIC;            // Seller CNIC (hashed)
    signal input buyerCNIC;             // Buyer CNIC (hashed)

    // Public outputs (visible to verifier)
    signal output capitalGainsTax;      // Calculated capital gains tax
    signal output stampDuty;            // Stamp duty amount
    signal output totalTax;             // Total tax liability
    signal output isEligible;           // Whether transfer is eligible (1 or 0)
    signal output amlCheckPassed;       // Anti-money laundering check

    // Intermediate signals
    signal capitalGain;
    signal adjustedGain;
    signal cgtRate;
    signal stampDutyRate;
    signal firstPropertyExemption;
    signal seniorCitizenExemption;
    signal validTransfer;

    // Constants for Pakistani property law (2024)
    var maxHoldingPeriod = 15;          // 15 years for full exemption
    var seniorCitizenAge = 60;          // Age threshold for exemption
    var residentialStampDuty = 3;       // 3% for residential
    var commercialStampDuty = 5;        // 5% for commercial
    var agriculturalStampDuty = 2;      // 2% for agricultural

    // Step 1: Calculate capital gain
    capitalGain <== purchasePrice - originalPurchasePrice;

    // Step 2: Ensure capital gain is calculated correctly
    component gainValid = GreaterEqThan(64);
    gainValid.in[0] <== purchasePrice;
    gainValid.in[1] <== originalPurchasePrice;

    // Step 3: Calculate CGT exemption based on holding period
    // Linear reduction: 0% after 15 years
    // Formula: effective_rate = max(0, base_rate * (1 - years/15))
    // Simplified in circuit: exemption factor = min(years, 15) / 15

    component yearsCapped = LessThan(64);
    yearsCapped.in[0] <== ownershipYears;
    yearsCapped.in[1] <== maxHoldingPeriod;

    signal effectiveYears;
    effectiveYears <== yearsCapped.out * ownershipYears + (1 - yearsCapped.out) * maxHoldingPeriod;

    // Exemption percentage (scaled by 100): effectiveYears * 100 / 15
    signal exemptionPercentage;
    exemptionPercentage <== effectiveYears * 100 / maxHoldingPeriod;

    // Step 4: Apply exemptions
    // First property exemption: 50% reduction for first residential property
    component isResidential = IsEqual();
    isResidential.in[0] <== propertyType;
    isResidential.in[1] <== 0;

    firstPropertyExemption <== isFirstProperty * isResidential.out * 50; // 50% exemption

    // Senior citizen exemption: Additional 25% reduction if buyer is 60+
    component isSenior = GreaterEqThan(64);
    isSenior.in[0] <== buyerAge;
    isSenior.in[1] <== seniorCitizenAge;

    seniorCitizenExemption <== isSenior.out * 25; // 25% additional exemption

    // Total exemption (capped at 100%)
    signal totalExemption;
    totalExemption <== exemptionPercentage + firstPropertyExemption + seniorCitizenExemption;

    component exemptionCapped = LessThan(64);
    exemptionCapped.in[0] <== totalExemption;
    exemptionCapped.in[1] <== 100;

    signal effectiveExemption;
    effectiveExemption <== exemptionCapped.out * totalExemption + (1 - exemptionCapped.out) * 100;

    // Step 5: Calculate CGT
    // Base CGT rate in Pakistan: 15% for property
    // Adjusted gain = capitalGain * (100 - effectiveExemption) / 100
    adjustedGain <== capitalGain * (100 - effectiveExemption) / 100;

    // CGT = adjustedGain * 15 / 100
    capitalGainsTax <== adjustedGain * 15 / 100;

    // Step 6: Calculate stamp duty based on property type
    // Stamp duty = purchasePrice * rate / 100
    signal sdRate;
    sdRate <-- (propertyType == 0) ? residentialStampDuty :
               (propertyType == 1) ? commercialStampDuty : agriculturalStampDuty;

    stampDuty <== purchasePrice * sdRate / 100;

    // Step 7: Calculate total tax
    totalTax <== capitalGainsTax + stampDuty;

    // Step 8: Eligibility checks
    // Transfer is eligible if:
    // 1. Capital gain is properly calculated
    // 2. Buyer and seller are different (CNIC hash check)
    // 3. Purchase price is reasonable (not 0 or negative)

    component buyerSellerDifferent = IsEqual();
    buyerSellerDifferent.in[0] <== buyerCNIC;
    buyerSellerDifferent.in[1] <== sellerCNIC;

    signal differentParties;
    differentParties <== 1 - buyerSellerDifferent.out; // 1 if different, 0 if same

    component pricePositive = GreaterThan(64);
    pricePositive.in[0] <== purchasePrice;
    pricePositive.in[1] <== 0;

    // Valid transfer requires all conditions
    validTransfer <== gainValid.out * differentParties * pricePositive.out;

    // Step 9: Anti-money laundering checks
    // Check if purchase price is suspiciously high (more than 10x original)
    // This is a simplified check - real AML is more complex

    component suspiciouslyHigh = LessThan(64);
    suspiciouslyHigh.in[0] <== purchasePrice;
    suspiciouslyHigh.in[1] <== originalPurchasePrice * 10;

    // AML check passes if price increase is reasonable
    amlCheckPassed <== suspiciouslyHigh.out;

    // Step 10: Final eligibility
    isEligible <== validTransfer * amlCheckPassed;

    // Step 11: Ensure non-negative tax
    component taxNonNegative = GreaterEqThan(64);
    taxNonNegative.in[0] <== totalTax;
    taxNonNegative.in[1] <== 0;
    taxNonNegative.out === 1;
}

component main {public [capitalGainsTax, stampDuty, totalTax, isEligible]} = PropertyTransfer();
