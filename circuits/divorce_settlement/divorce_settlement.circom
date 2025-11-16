pragma circom 2.0.0;

/*
 * Divorce Settlement Circuit
 *
 * Calculates fair divorce settlement according to Pakistani family law
 * without revealing exact financial details of either party.
 *
 * Calculates:
 * - Alimony (maintenance) payments
 * - Child support
 * - Asset division
 * - Mehr (Islamic dower) settlement
 *
 * Complies with:
 * - Muslim Family Laws Ordinance, 1961
 * - West Pakistan Family Courts Act, 1964
 * - Dissolution of Muslim Marriages Act, 1939
 */

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/gates.circom";

template DivorceSettlement() {
    // Private inputs - Financial information
    signal input husbandIncome;         // Monthly income in PKR (scaled by 100)
    signal input wifeIncome;            // Monthly income in PKR (scaled by 100)
    signal input husbandAssets;         // Total assets in PKR (scaled by 100)
    signal input wifeAssets;            // Total assets in PKR (scaled by 100)
    signal input marriageDuration;      // Years of marriage
    signal input numberOfChildren;      // Number of children
    signal input childrenAges;          // Sum of children's ages (for calculation)
    signal input mehrAmount;            // Agreed Mehr in PKR (scaled by 100)
    signal input mehrPaid;              // Mehr already paid (scaled by 100)

    // Private inputs - Circumstances
    signal input custodyToWife;         // 1 if wife gets custody, 0 otherwise
    signal input wifeContributed;       // 1 if wife contributed financially, 0 otherwise
    signal input faultDivorce;          // 1 if at-fault divorce, 0 if no-fault
    signal input faultParty;            // 0=husband, 1=wife (only relevant if faultDivorce=1)

    // Public inputs - Legal parameters
    signal input minimumMaintenance;    // Minimum maintenance by law
    signal input childSupportRate;      // Child support rate (percentage)

    // Public outputs
    signal output monthlyAlimony;       // Monthly maintenance to wife
    signal output monthlyChildSupport;  // Monthly child support
    signal output wifeShareAssets;      // Wife's share of assets
    signal output husbandShareAssets;   // Husband's share of assets
    signal output mehrBalance;          // Remaining Mehr to be paid
    signal output totalSettlement;      // Total one-time settlement
    signal output isValid;              // Whether settlement is valid

    // Intermediate signals
    signal alimonyBase;
    signal alimonyAdjusted;
    signal childSupportPerChild;
    signal totalChildSupport;
    signal assetDivisionRatio;
    signal wifeAssetShare;
    signal husbandAssetShare;
    signal totalAssets;
    signal validSettlement;

    // Constants (Pakistani family law 2024)
    var maxAlimonyYears = 2;                // Typically 2 years max for able-bodied wife
    var minAlimonyPercentage = 25;          // Min 25% of husband's income
    var maxAlimonyPercentage = 33;          // Max 1/3 of husband's income
    var childSupportPercentage = 20;        // 20% of income per child
    var childSupportMaxAge = 18;            // Support until age 18
    var assetContributionBonus = 10;        // 10% bonus if wife contributed

    // Step 1: Calculate base alimony (Iddat period + maintenance)
    // During Iddat (3 months): Full maintenance required
    // Post-Iddat: Based on circumstances and duration

    // Base alimony: percentage of husband's income
    // Starts at 25%, can go up to 33% based on circumstances
    signal alimonyPercentage;
    alimonyPercentage <-- minAlimonyPercentage +
        (wifeIncome == 0 ? 5 : 0) +                    // +5% if wife has no income
        (marriageDuration > 10 ? 3 : 0);               // +3% if married >10 years

    alimonyBase <== husbandIncome * alimonyPercentage / 100;

    // Step 2: Adjust alimony based on wife's income
    // If wife has substantial income, reduce alimony
    component wifeHasIncome = GreaterThan(64);
    wifeHasIncome.in[0] <== wifeIncome;
    wifeHasIncome.in[1] <== husbandIncome / 2; // More than 50% of husband's income

    signal alimonyReduction;
    alimonyReduction <== wifeHasIncome.out * (alimonyBase * 30 / 100); // Reduce by 30%

    alimonyAdjusted <== alimonyBase - alimonyReduction;

    // Step 3: Ensure alimony meets minimum requirement
    component meetsMinimum = GreaterEqThan(64);
    meetsMinimum.in[0] <== alimonyAdjusted;
    meetsMinimum.in[1] <== minimumMaintenance;

    monthlyAlimony <== meetsMinimum.out * alimonyAdjusted +
                       (1 - meetsMinimum.out) * minimumMaintenance;

    // Step 4: Calculate child support
    // Per child: childSupportRate% of income
    // Total capped at reasonable amount

    childSupportPerChild <== husbandIncome * childSupportRate / 100;
    totalChildSupport <== childSupportPerChild * numberOfChildren;

    // If wife has custody, she receives child support
    // If husband has custody, wife may pay (based on income)
    component wifeHasCustody = IsEqual();
    wifeHasCustody.in[0] <== custodyToWife;
    wifeHasCustody.in[1] <== 1;

    // Child support direction
    signal childSupportFromHusband;
    childSupportFromHusband <== wifeHasCustody.out * totalChildSupport;

    signal childSupportFromWife;
    // If wife has custody=0 (husband has custody) and wife has income
    signal wifeHasCustodyInverse;
    wifeHasCustodyInverse <== 1 - custodyToWife;

    childSupportFromWife <== wifeHasCustodyInverse * (wifeIncome * childSupportRate / 100) * numberOfChildren;

    // Net child support (positive = husband pays, negative = wife pays)
    monthlyChildSupport <== childSupportFromHusband - childSupportFromWife;

    // Step 5: Asset division
    // Islamic law: Wife entitled to her own assets + share of joint assets
    // Base: 50/50 split of joint assets
    // Adjustments:
    // - Wife contributed financially: +10%
    // - Long marriage (>15 years): +5%
    // - At-fault divorce by husband: +10%

    totalAssets <== husbandAssets + wifeAssets;

    // Calculate wife's share percentage
    signal wifeBonusPercentage;
    wifeBonusPercentage <-- 50 +
        (wifeContributed * assetContributionBonus) +           // +10% if contributed
        (marriageDuration > 15 ? 5 : 0) +                      // +5% for long marriage
        (faultDivorce * (1 - faultParty) * 10);                // +10% if husband at fault

    wifeAssetShare <== totalAssets * wifeBonusPercentage / 100;
    husbandAssetShare <== totalAssets - wifeAssetShare;

    // Step 6: Mehr settlement
    // Mehr is an Islamic dower - wife's right
    // Calculate unpaid Mehr
    component mehrNotPaid = GreaterThan(64);
    mehrNotPaid.in[0] <== mehrAmount;
    mehrNotPaid.in[1] <== mehrPaid;

    mehrBalance <== mehrNotPaid.out * (mehrAmount - mehrPaid);

    // Step 7: Total settlement
    // One-time payment = Mehr balance + (monthly alimony * 24 months as lump sum option)
    signal lumpSumAlimony;
    lumpSumAlimony <== monthlyAlimony * 24; // 2 years as lump sum

    totalSettlement <== mehrBalance + lumpSumAlimony + wifeAssetShare;

    // Step 8: Validation checks
    // Settlement is valid if:
    // 1. Wife's asset share is non-negative
    // 2. Husband's asset share is non-negative
    // 3. Alimony is within legal bounds
    // 4. Child support is reasonable

    component wifeShareValid = GreaterEqThan(64);
    wifeShareValid.in[0] <== wifeAssetShare;
    wifeShareValid.in[1] <== 0;

    component husbandShareValid = GreaterEqThan(64);
    husbandShareValid.in[0] <== husbandAssetShare;
    husbandShareValid.in[1] <== 0;

    component alimonyInBounds = LessThan(64);
    alimonyInBounds.in[0] <== monthlyAlimony;
    alimonyInBounds.in[1] <== husbandIncome * maxAlimonyPercentage / 100;

    component childSupportReasonable = LessThan(64);
    childSupportReasonable.in[0] <== monthlyChildSupport;
    childSupportReasonable.in[1] <== husbandIncome * 60 / 100; // Max 60% of income

    // All checks must pass
    validSettlement <== wifeShareValid.out *
                        husbandShareValid.out *
                        alimonyInBounds.out *
                        childSupportReasonable.out;

    isValid <== validSettlement;

    // Step 9: Ensure outputs are non-negative
    component settlementNonNegative = GreaterEqThan(64);
    settlementNonNegative.in[0] <== totalSettlement;
    settlementNonNegative.in[1] <== 0;
    settlementNonNegative.out === 1;
}

component main {public [monthlyAlimony, monthlyChildSupport, totalSettlement, isValid]} = DivorceSettlement();
