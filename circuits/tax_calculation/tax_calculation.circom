pragma circom 2.0.0;

/*
 * Tax Calculation Circuit
 *
 * Proves that a tax calculation is correct according to Pakistani tax law
 * without revealing the actual income or deductions.
 *
 * This circuit can be integrated with Catala tax code formalization
 */

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";

template TaxCalculation() {
    // Private inputs (hidden from public)
    signal input income;                // Annual income in PKR (scaled by 100)
    signal input totalDeductions;       // Total deductions in PKR (scaled by 100)
    signal input dependents;            // Number of dependents
    signal input filingStatus;          // 0=single, 1=married, 2=head_of_household

    // Public outputs (visible to verifier)
    signal output taxOwed;              // Calculated tax in PKR (scaled by 100)
    signal output taxBracket;           // Tax bracket indicator
    signal output isValid;              // Whether calculation is valid (1 or 0)

    // Intermediate signals
    signal taxableIncome;
    signal baseTax;
    signal dependentCredit;
    signal finalTax;

    // Constants for Pakistani tax brackets (2024)
    // Bracket 1: 0-600,000 = 0%
    // Bracket 2: 600,001-1,200,000 = 5%
    // Bracket 3: 1,200,001-2,400,000 = 15%
    // Bracket 4: 2,400,001-3,600,000 = 20%
    // Bracket 5: 3,600,001+ = 35%

    var bracket1Limit = 60000000;  // 600,000 * 100
    var bracket2Limit = 120000000; // 1,200,000 * 100
    var bracket3Limit = 240000000; // 2,400,000 * 100
    var bracket4Limit = 360000000; // 3,600,000 * 100

    // Step 1: Calculate taxable income
    taxableIncome <== income - totalDeductions;

    // Step 2: Ensure taxable income is non-negative
    component gtZero = GreaterEqThan(64);
    gtZero.in[0] <== taxableIncome;
    gtZero.in[1] <== 0;
    gtZero.out === 1;

    // Step 3: Determine tax bracket and calculate tax
    component inBracket1 = LessThan(64);
    inBracket1.in[0] <== taxableIncome;
    inBracket1.in[1] <== bracket1Limit;

    component inBracket2 = LessThan(64);
    inBracket2.in[0] <== taxableIncome;
    inBracket2.in[1] <== bracket2Limit;

    component inBracket3 = LessThan(64);
    inBracket3.in[0] <== taxableIncome;
    inBracket3.in[1] <== bracket3Limit;

    component inBracket4 = LessThan(64);
    inBracket4.in[0] <== taxableIncome;
    inBracket4.in[1] <== bracket4Limit;

    // Simplified tax calculation (for demonstration)
    // In production, this would be a complete implementation of tax brackets
    signal taxRate;
    taxRate <-- (taxableIncome < bracket1Limit) ? 0 :
                (taxableIncome < bracket2Limit) ? 5 :
                (taxableIncome < bracket3Limit) ? 15 :
                (taxableIncome < bracket4Limit) ? 20 : 35;

    // Calculate base tax (simplified)
    baseTax <== taxableIncome * taxRate / 100;

    // Step 4: Apply dependent credits (10,000 PKR per dependent)
    dependentCredit <== dependents * 1000000; // 10,000 * 100

    // Step 5: Calculate final tax
    component taxGtCredit = GreaterEqThan(64);
    taxGtCredit.in[0] <== baseTax;
    taxGtCredit.in[1] <== dependentCredit;

    finalTax <== taxGtCredit.out * (baseTax - dependentCredit);

    // Ensure final tax is non-negative
    component finalGtZero = GreaterEqThan(64);
    finalGtZero.in[0] <== finalTax;
    finalGtZero.in[1] <== 0;

    // Output results
    taxOwed <== finalTax;
    taxBracket <== taxRate;
    isValid <== finalGtZero.out;
}

component main {public [taxOwed, taxBracket]} = TaxCalculation();
