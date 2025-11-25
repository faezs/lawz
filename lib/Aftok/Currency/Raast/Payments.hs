{-# LANGUAGE OverloadedStrings #-}

module Aftok.Currency.Raast.Payments
  ( -- * Payment Request Creation
    createPaymentRequest,
    createEncryptedPaymentRequest,

    -- * Payment Processing
    submitPayment,
    verifyPayment,
    confirmPayment,

    -- * FHE Operations on Payments
    aggregatePayments,
    calculateFees,

    -- * Status Management
    updatePaymentStatus,
    getPaymentStatus,

    -- * Validation
    validatePaymentRequest,
    validateIBAN,
  )
where

import Aftok.Currency.Raast.FHE
import Aftok.Currency.Raast.Types
import Control.Monad.IO.Class (MonadIO, liftIO)
import Data.ByteString (ByteString)
import Data.Text (Text)
import qualified Data.Text as T
import Data.Time.Clock (UTCTime, addUTCTime, getCurrentTime)
import Data.UUID (UUID)
import qualified Data.UUID.V4 as UUID4

-- | Create a Raast payment request with plaintext amount
-- This is converted to FHE encrypted amount internally
createPaymentRequest ::
  MonadIO m =>
  IBAN -> -- sender
  IBAN -> -- recipient
  Paisa -> -- amount
  RaastPurposeCode -> -- purpose
  Maybe Text -> -- narrative
  FHEKeyPair -> -- sender's FHE key pair
  m RaastPaymentRequest
createPaymentRequest senderIban recipientIban amount purposeCode narrative keyPair = do
  requestId <- liftIO UUID4.nextRandom

  -- Encrypt amount using sender's FHE public key
  encryptedAmount <- encrypt (_fhePublicKey keyPair) (_fheScheme keyPair) amount

  -- Generate ZK range proof: 0 < amount < 1,000,000 PKR (100M paisa)
  let maxAmount = Paisa 100000000 -- 1M PKR daily limit
  zkProof <- generateRangeProof encryptedAmount (Paisa 1) maxAmount (_fheSecretKey keyPair)

  -- Generate compliance proof
  let tempRequest =
        RaastPaymentRequest
          { _raastPaymentRequestId = requestId,
            _raastPaymentSenderIBAN = senderIban,
            _raastPaymentRecipientIBAN = recipientIban,
            _raastPaymentSenderID = Nothing,
            _raastPaymentRecipientID = Nothing,
            _raastPaymentEncryptedAmount = encryptedAmount,
            _raastPaymentPurposeCode = purposeCode,
            _raastPaymentNarrative = narrative,
            _raastPaymentZKProof = Just zkProof,
            _raastPaymentZKVerified = False,
            _raastPaymentStatus = RaastPending,
            _raastPaymentTransactionId = Nothing
          }

  complianceProof <- generateComplianceProof tempRequest (_fheSecretKey keyPair)

  -- Combine proofs
  let combinedProof = zkProof <> "_" <> complianceProof

  pure
    tempRequest
      { _raastPaymentZKProof = Just combinedProof
      }

-- | Create payment request with already encrypted amount
-- Used when amount is already encrypted (e.g., from aggregation)
createEncryptedPaymentRequest ::
  MonadIO m =>
  IBAN ->
  IBAN ->
  FHEEncryptedAmount ->
  RaastPurposeCode ->
  Maybe Text ->
  m RaastPaymentRequest
createEncryptedPaymentRequest senderIban recipientIban encAmount purposeCode narrative = do
  requestId <- liftIO UUID4.nextRandom

  pure
    RaastPaymentRequest
      { _raastPaymentRequestId = requestId,
        _raastPaymentSenderIBAN = senderIban,
        _raastPaymentRecipientIBAN = recipientIban,
        _raastPaymentSenderID = Nothing,
        _raastPaymentRecipientID = Nothing,
        _raastPaymentEncryptedAmount = encAmount,
        _raastPaymentPurposeCode = purposeCode,
        _raastPaymentNarrative = narrative,
        _raastPaymentZKProof = Nothing,
        _raastPaymentZKVerified = False,
        _raastPaymentStatus = RaastPending,
        _raastPaymentTransactionId = Nothing
      }

-- | Verify payment request using ZK proofs
-- This is fast (dispatch to ZK) compared to FHE operations
verifyPayment :: MonadIO m => RaastPaymentRequest -> m Bool
verifyPayment request = do
  case _raastPaymentZKProof request of
    Nothing -> pure False
    Just proof -> do
      -- Verify range proof
      let encAmount = _raastPaymentEncryptedAmount request
          minAmount = Paisa 1
          maxAmount = Paisa 100000000 -- 1M PKR

      rangeValid <- verifyRangeProof proof encAmount minAmount maxAmount

      -- Verify compliance proof
      complianceValid <- verifyComplianceProof proof request

      pure (rangeValid && complianceValid)

-- | Submit payment to Raast network
-- In production, this would call Raast API
submitPayment :: MonadIO m => RaastPaymentRequest -> m (Either Text RaastPaymentRequest)
submitPayment request = do
  -- Verify payment first
  isValid <- verifyPayment request

  if not isValid
    then pure $ Left "Payment verification failed"
    else do
      -- Generate transaction ID
      transactionId <- liftIO $ fmap (("RAAST_" <>) . show) UUID4.nextRandom

      currentTime <- liftIO getCurrentTime

      -- In production: Call Raast API
      -- POST /api/v1/payments
      -- Body: { sender_iban, recipient_iban, encrypted_amount, purpose_code, ... }

      -- Mock successful submission
      pure $
        Right
          request
            { _raastPaymentStatus = RaastSubmitted,
              _raastPaymentTransactionId = Just transactionId
            }

-- | Confirm payment after receiving Raast confirmation
confirmPayment :: MonadIO m => RaastPaymentRequest -> Text -> m RaastPayment
confirmPayment request raastTxId = do
  confirmationId <- liftIO UUID4.nextRandom

  -- Create payment confirmation
  pure
    RaastPayment
      { _raastConfirmationId = confirmationId,
        _raastConfirmationTransactionId = raastTxId,
        _raastConfirmationReferenceNumber = Nothing,
        _raastConfirmationBankReference = Nothing,
        _raastConfirmationSettlementAmount = _raastPaymentEncryptedAmount request,
        _raastConfirmationStatus = "confirmed"
      }

-- | Aggregate multiple payments using FHE semiring operations
-- This demonstrates the power of FHE: compute sum without decryption
aggregatePayments :: MonadIO m => [RaastPaymentRequest] -> m (Maybe FHEEncryptedAmount)
aggregatePayments requests = do
  let encryptedAmounts = map _raastPaymentEncryptedAmount requests
  homoAggregate encryptedAmounts

-- | Calculate fees on encrypted amount without decryption
-- Uses homomorphic scalar multiplication
calculateFees ::
  MonadIO m =>
  FHEEncryptedAmount ->
  Word64 -> -- fee basis points (e.g., 50 = 0.5%)
  m FHEEncryptedAmount
calculateFees encAmount feeBasisPoints = do
  -- Fee = amount * (feeBasisPoints / 10000)
  -- Since we can't do division in FHE, we multiply by fee and divide later
  homoMul encAmount feeBasisPoints

-- | Update payment status
updatePaymentStatus ::
  MonadIO m =>
  RaastPaymentRequest ->
  RaastPaymentStatus ->
  m RaastPaymentRequest
updatePaymentStatus request newStatus =
  pure request {_raastPaymentStatus = newStatus}

-- | Get payment status
getPaymentStatus :: RaastPaymentRequest -> RaastPaymentStatus
getPaymentStatus = _raastPaymentStatus

-- | Validate payment request before submission
validatePaymentRequest :: MonadIO m => RaastPaymentRequest -> m (Either Text ())
validatePaymentRequest request = do
  -- Validate sender IBAN
  case validateIBAN (_raastPaymentSenderIBAN request) of
    Nothing -> pure $ Left "Invalid sender IBAN"
    Just _ -> do
      -- Validate recipient IBAN
      case validateIBAN (_raastPaymentRecipientIBAN request) of
        Nothing -> pure $ Left "Invalid recipient IBAN"
        Just _ -> do
          -- Validate ZK proof exists
          case _raastPaymentZKProof request of
            Nothing -> pure $ Left "Missing ZK proof"
            Just _ -> pure $ Right ()

-- | Validate IBAN (re-export for convenience)
validateIBAN :: IBAN -> Maybe IBAN
validateIBAN iban@(IBAN text) =
  if T.length text == 24 && T.isPrefixOf "PK" text
    then Just iban
    else Nothing

-- | Mock Raast API client functions
-- In production, these would be actual HTTP calls to Raast API

-- Example Raast API request structure:
{-
data RaastAPIRequest = RaastAPIRequest
  { apiSenderIBAN :: Text,
    apiRecipientIBAN :: Text,
    apiEncryptedAmount :: Text,  -- Base64 encoded ciphertext
    apiPurposeCode :: Text,
    apiNarrative :: Maybe Text,
    apiZKProof :: Text,  -- Base64 encoded proof
    apiTimestamp :: UTCTime
  }
-}

-- Example Raast API response structure:
{-
data RaastAPIResponse = RaastAPIResponse
  { apiTransactionId :: Text,
    apiStatus :: Text,
    apiReferenceNumber :: Text,
    apiTimestamp :: UTCTime
  }
-}
