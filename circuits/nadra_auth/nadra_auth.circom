pragma circom 2.0.0;

/*
 * NADRA Authentication Circuit
 *
 * Proves knowledge of a valid CNIC and fingerprint hash
 * without revealing the actual biometric data.
 *
 * This demonstrates zero-knowledge authentication for government ID systems.
 */

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template NADRAAuth() {
    // Private inputs (never revealed)
    signal input cnicNumber;        // CNIC as number (13 digits)
    signal input fingerprintHash;   // Hash of biometric data
    signal input authSecret;        // User's secret key

    // Public inputs (revealed for verification)
    signal input timestamp;         // Current timestamp
    signal input challenge;         // Random challenge from server

    // Public outputs
    signal output authToken;        // Authentication token
    signal output isValid;          // Whether auth is valid

    // Constants
    var MIN_CNIC = 1000000000000;  // Minimum valid CNIC (13 digits)
    var MAX_CNIC = 9999999999999;  // Maximum valid CNIC (13 digits)

    // Step 1: Validate CNIC is in valid range
    component cnicGtMin = GreaterEqThan(64);
    cnicGtMin.in[0] <== cnicNumber;
    cnicGtMin.in[1] <== MIN_CNIC;

    component cnicLtMax = LessEqThan(64);
    cnicLtMax.in[0] <== cnicNumber;
    cnicLtMax.in[1] <== MAX_CNIC;

    signal cnicValid;
    cnicValid <== cnicGtMin.out * cnicLtMax.out;

    // Step 2: Hash the CNIC with fingerprint using Poseidon
    component hashCnicFingerprint = Poseidon(2);
    hashCnicFingerprint.inputs[0] <== cnicNumber;
    hashCnicFingerprint.inputs[1] <== fingerprintHash;

    // Step 3: Combine with auth secret
    component hashWithSecret = Poseidon(2);
    hashWithSecret.inputs[0] <== hashCnicFingerprint.out;
    hashWithSecret.inputs[1] <== authSecret;

    // Step 4: Create token with challenge and timestamp
    component createToken = Poseidon(3);
    createToken.inputs[0] <== hashWithSecret.out;
    createToken.inputs[1] <== challenge;
    createToken.inputs[2] <== timestamp;

    // Output the authentication token
    authToken <== createToken.out;

    // Validity is based on CNIC being valid
    isValid <== cnicValid;
}

component main {public [timestamp, challenge, authToken, isValid]} = NADRAAuth();
