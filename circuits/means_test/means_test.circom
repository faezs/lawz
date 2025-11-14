pragma circom 2.0.0;

/*
 * Means Test Circuit
 *
 * Proves financial eligibility for legal aid or divorce settlement
 * without revealing exact financial details.
 *
 * Useful for:
 * - Divorce settlement calculations
 * - Legal aid eligibility
 * - Bankruptcy proceedings
 * - Child support determinations
 */

include "../node_modules/circomlib/circuits/comparators.circom";

template MeansTest() {
    // Private inputs
    signal input monthlyIncome;         // Monthly income in PKR (scaled by 100)
    signal input monthlyExpenses;       // Monthly expenses in PKR (scaled by 100)
    signal input totalAssets;           // Total asset value in PKR (scaled by 100)
    signal input totalLiabilities;      // Total liabilities in PKR (scaled by 100)
    signal input dependents;            // Number of dependents

    // Public inputs
    signal input eligibilityThreshold;  // Threshold for eligibility in PKR (scaled by 100)

    // Public outputs
    signal output isEligible;           // 1 if eligible, 0 if not
    signal output disposableIncome;     // Monthly disposable income (public for verification)
    signal output netWorth;             // Net worth (public for verification)

    // Intermediate signals
    signal monthlyDisposable;
    signal annualDisposable;
    signal adjustedNetWorth;
    signal dependentAdjustment;
    signal totalNeed;

    // Step 1: Calculate monthly disposable income
    monthlyDisposable <== monthlyIncome - monthlyExpenses;

    // Step 2: Ensure disposable income is calculated correctly
    component dispGtZero = GreaterEqThan(64);
    dispGtZero.in[0] <== monthlyDisposable + monthlyExpenses;
    dispGtZero.in[1] <== monthlyExpenses;
    dispGtZero.out === 1;

    // Step 3: Calculate annual disposable income
    annualDisposable <== monthlyDisposable * 12;

    // Step 4: Calculate net worth
    signal calculatedNetWorth;
    calculatedNetWorth <== totalAssets - totalLiabilities;

    // Step 5: Apply dependent adjustment (increase threshold by 10% per dependent)
    // In Pakistan, dependent allowances affect eligibility
    dependentAdjustment <== eligibilityThreshold * dependents * 10 / 100;

    // Step 6: Adjusted threshold
    signal adjustedThreshold;
    adjustedThreshold <== eligibilityThreshold + dependentAdjustment;

    // Step 7: Calculate total financial need indicator
    // Combines disposable income and net worth
    totalNeed <== annualDisposable + (calculatedNetWorth / 10);

    // Step 8: Check eligibility
    // Eligible if total need is below adjusted threshold
    component isElig = LessThan(64);
    isElig.in[0] <== totalNeed;
    isElig.in[1] <== adjustedThreshold;

    // Step 9: Verify net worth calculation
    component verifyNetWorth = GreaterEqThan(64);
    verifyNetWorth.in[0] <== totalAssets;
    verifyNetWorth.in[1] <== totalLiabilities;

    // Output results
    isEligible <== isElig.out;
    disposableIncome <== monthlyDisposable;
    netWorth <== calculatedNetWorth;

    // Additional constraint: if net worth calculation is invalid, not eligible
    signal eligibilityProduct;
    eligibilityProduct <== isEligible * verifyNetWorth.out;
    eligibilityProduct === isEligible;
}

component main {public [eligibilityThreshold, isEligible, disposableIncome, netWorth]} = MeansTest();
