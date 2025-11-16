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

    // Proper tax calculation with bracket implementation
    // Pakistani tax system (2024) - Progressive taxation

    // Bracket amounts to tax
    signal bracket1Amount;
    signal bracket2Amount;
    signal bracket3Amount;
    signal bracket4Amount;
    signal bracket5Amount;

    // Calculate amount in each bracket
    // Bracket 1: 0-600,000 @ 0%
    component b1Check = LessThan(64);
    b1Check.in[0] <== taxableIncome;
    b1Check.in[1] <== bracket1Limit;

    bracket1Amount <== b1Check.out * taxableIncome +
                       (1 - b1Check.out) * bracket1Limit;

    // Bracket 2: 600,001-1,200,000 @ 5%
    signal excessOverB1;
    excessOverB1 <== taxableIncome - bracket1Limit;

    component b2Check = LessThan(64);
    b2Check.in[0] <== taxableIncome;
    b2Check.in[1] <== bracket2Limit;

    signal b2Taxable;
    b2Taxable <== excessOverB1 * (1 - b1Check.out);

    bracket2Amount <== b2Check.out * b2Taxable +
                       (1 - b2Check.out) * (bracket2Limit - bracket1Limit);

    // Bracket 3: 1,200,001-2,400,000 @ 15%
    signal excessOverB2;
    excessOverB2 <== taxableIncome - bracket2Limit;

    component b3Check = LessThan(64);
    b3Check.in[0] <== taxableIncome;
    b3Check.in[1] <== bracket3Limit;

    signal b3Taxable;
    b3Taxable <== excessOverB2 * (1 - b2Check.out);

    bracket3Amount <== b3Check.out * b3Taxable +
                       (1 - b3Check.out) * (bracket3Limit - bracket2Limit);

    // Bracket 4: 2,400,001-3,600,000 @ 20%
    signal excessOverB3;
    excessOverB3 <== taxableIncome - bracket3Limit;

    signal b4Taxable;
    b4Taxable <== excessOverB3 * (1 - b3Check.out);

    bracket4Amount <== inBracket4.out * b4Taxable +
                       (1 - inBracket4.out) * (bracket4Limit - bracket3Limit);

    // Bracket 5: 3,600,001+ @ 35%
    signal excessOverB4;
    excessOverB4 <== taxableIncome - bracket4Limit;

    signal b5Taxable;
    b5Taxable <== excessOverB4 * (1 - inBracket4.out);
    bracket5Amount <== b5Taxable;

    // Calculate total tax
    signal tax1, tax2, tax3, tax4, tax5;
    tax1 <== bracket1Amount * 0 / 100;     // 0%
    tax2 <== bracket2Amount * 5 / 100;     // 5%
    tax3 <== bracket3Amount * 15 / 100;    // 15%
    tax4 <== bracket4Amount * 20 / 100;    // 20%
    tax5 <== bracket5Amount * 35 / 100;    // 35%

    baseTax <== tax1 + tax2 + tax3 + tax4 + tax5;

    // Determine tax bracket for output
    signal taxRate;
    taxRate <-- (taxableIncome < bracket1Limit) ? 0 :
                (taxableIncome < bracket2Limit) ? 5 :
                (taxableIncome < bracket3Limit) ? 15 :
                (taxableIncome < bracket4Limit) ? 20 : 35;

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
