{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE GeneralizedNewtypeDeriving #-}
{-# LANGUAGE OverloadedStrings #-}
{-# LANGUAGE TemplateHaskell #-}

module Aftok.Currency.Raast.Types where

import Control.Lens (Iso', iso, makeLenses, makePrisms)
import Data.Aeson (FromJSON, ToJSON, parseJSON, toJSON, withText)
import Data.ByteString (ByteString)
import qualified Data.ByteString.Base64 as B64
import Data.Serialize (Serialize)
import Data.Text (Text)
import qualified Data.Text as T
import qualified Data.Text.Encoding as TE
import Data.UUID (UUID)
import GHC.Generics (Generic)

-- | Pakistani Rupee paisa (1 PKR = 100 paisa)
-- Using smallest denomination for precision in financial calculations
newtype Paisa = Paisa {unPaisa :: Word64}
  deriving (Eq, Ord, Show, Generic, Serialize)

instance Semigroup Paisa where
  (Paisa a) <> (Paisa b) = Paisa (a + b)

instance Monoid Paisa where
  mempty = Paisa 0

-- | Subtract paisa, returning Nothing if result would be negative
psub :: Paisa -> Paisa -> Maybe Paisa
psub (Paisa a) (Paisa b) =
  if a >= b then Just (Paisa (a - b)) else Nothing

-- | Lens for converting between Paisa and Word64
_Paisa :: Iso' Paisa Word64
_Paisa = iso unPaisa Paisa

-- | Convert PKR to paisa (1 PKR = 100 paisa)
pkrToPaisa :: Rational -> Paisa
pkrToPaisa pkr = Paisa (round $ pkr * 100)

-- | Convert paisa to PKR
paisaToPkr :: Paisa -> Rational
paisaToPkr (Paisa p) = toRational p / 100

-- | International Bank Account Number (IBAN) for Pakistani banks
-- Format: PK + 2 check digits + 4 bank code + 16 account number = 24 chars
newtype IBAN = IBAN {unIBAN :: Text}
  deriving (Eq, Ord, Show, Generic)

instance ToJSON IBAN where
  toJSON (IBAN t) = toJSON t

instance FromJSON IBAN where
  parseJSON = withText "IBAN" $ \t ->
    case validateIBAN t of
      Just iban -> pure iban
      Nothing -> fail "Invalid IBAN format"

instance Serialize IBAN where
  -- Serialize as UTF-8 encoded text
  put (IBAN t) = put (TE.encodeUtf8 t)
  get = fmap (IBAN . TE.decodeUtf8) get

-- | Validate IBAN format for Pakistan
-- Format: PK + 2 check digits + bank identifier + account number
-- Length: 24 characters
validateIBAN :: Text -> Maybe IBAN
validateIBAN t
  | T.length t /= 24 = Nothing
  | not (T.isPrefixOf "PK" t) = Nothing
  | not (T.all (\c -> c >= '0' && c <= '9' || c >= 'A' && c <= 'Z') t) = Nothing
  | otherwise = Just (IBAN t)

-- | Raast ID (aliases for IBAN or mobile numbers)
data RaastID
  = RaastIBAN IBAN
  | RaastMobile Text -- E.164 format: +92 followed by 10 digits
  | RaastAlias Text -- Custom alias registered in Raast
  deriving (Eq, Show, Generic)

instance ToJSON RaastID

instance FromJSON RaastID

-- | FHE (Fully Homomorphic Encryption) scheme types
data FHEScheme
  = TFHE -- TFHE (Fast bootstrapping, good for boolean circuits)
  | BFV -- Brakerski-Fan-Vercauteren (integers, moderate noise)
  | BGV -- Brakerski-Gentry-Vaikuntanathan (integers, leveled)
  | CKKS -- Cheon-Kim-Kim-Song (approximate arithmetic, floating point)
  deriving (Eq, Show, Generic, Enum, Bounded)

instance ToJSON FHEScheme

instance FromJSON FHEScheme

-- | FHE public key (serialized as base64)
newtype FHEPublicKey = FHEPublicKey {unFHEPublicKey :: ByteString}
  deriving (Eq, Show, Generic)

instance ToJSON FHEPublicKey where
  toJSON (FHEPublicKey bs) = toJSON (TE.decodeUtf8 $ B64.encode bs)

instance FromJSON FHEPublicKey where
  parseJSON = withText "FHEPublicKey" $ \t ->
    case B64.decode (TE.encodeUtf8 t) of
      Right bs -> pure (FHEPublicKey bs)
      Left _ -> fail "Invalid base64 encoded FHE public key"

-- | FHE secret key (always encrypted with user's master key)
newtype FHESecretKey = FHESecretKey {unFHESecretKey :: ByteString}
  deriving (Eq, Show, Generic)

instance ToJSON FHESecretKey where
  toJSON (FHESecretKey bs) = toJSON (TE.decodeUtf8 $ B64.encode bs)

instance FromJSON FHESecretKey where
  parseJSON = withText "FHESecretKey" $ \t ->
    case B64.decode (TE.encodeUtf8 t) of
      Right bs -> pure (FHESecretKey bs)
      Left _ -> fail "Invalid base64 encoded FHE secret key"

-- | FHE ciphertext (encrypted amount)
newtype FHECiphertext = FHECiphertext {unFHECiphertext :: ByteString}
  deriving (Eq, Show, Generic)

instance ToJSON FHECiphertext where
  toJSON (FHECiphertext bs) = toJSON (TE.decodeUtf8 $ B64.encode bs)

instance FromJSON FHECiphertext where
  parseJSON = withText "FHECiphertext" $ \t ->
    case B64.decode (TE.encodeUtf8 t) of
      Right bs -> pure (FHECiphertext bs)
      Left _ -> fail "Invalid base64 encoded FHE ciphertext"

-- | FHE key pair
data FHEKeyPair = FHEKeyPair
  { _fheKeyId :: !UUID,
    _fheScheme :: !FHEScheme,
    _fhePublicKey :: !FHEPublicKey,
    _fheSecretKey :: !FHESecretKey
  }
  deriving (Eq, Show, Generic)

makeLenses ''FHEKeyPair

instance ToJSON FHEKeyPair

instance FromJSON FHEKeyPair

-- | Encrypted amount with FHE
data FHEEncryptedAmount = FHEEncryptedAmount
  { _fheAmount :: !FHECiphertext,
    _fheAmountKeyId :: !UUID,
    _fheAmountScheme :: !FHEScheme,
    _fheOperationType :: !FHEOperationType,
    _fheParentCiphertexts :: ![UUID] -- For tracking semiring operations
  }
  deriving (Eq, Show, Generic)

makeLenses ''FHEEncryptedAmount

instance ToJSON FHEEncryptedAmount

instance FromJSON FHEEncryptedAmount

-- | FHE operation types (semiring structure)
data FHEOperationType
  = FHEBase -- Base encryption of plaintext amount
  | FHEAdd -- Homomorphic addition: Enc(a) + Enc(b) = Enc(a + b)
  | FHEMul -- Homomorphic multiplication: Enc(a) * scalar = Enc(a * scalar)
  | FHEAggregate -- Aggregation of multiple ciphertexts
  deriving (Eq, Show, Generic, Enum)

instance ToJSON FHEOperationType

instance FromJSON FHEOperationType

-- | Raast account information
data RaastAccount = RaastAccount
  { _raastAccountId :: !UUID,
    _raastAccountUserId :: !UUID,
    _raastIban :: !IBAN,
    _raastId :: !(Maybe RaastID),
    _raastBankCode :: !Text,
    _raastAccountTitle :: !Text,
    _raastFHEKeyPair :: !FHEKeyPair,
    _raastIsPrimary :: !Bool,
    _raastIsVerified :: !Bool
  }
  deriving (Eq, Show, Generic)

makeLenses ''RaastAccount

instance ToJSON RaastAccount

instance FromJSON RaastAccount

-- | Raast payment purpose codes (as per SBP guidelines)
data RaastPurposeCode
  = PersonToPerson -- 001
  | PersonToBusiness -- 002
  | BusinessToPerson -- 003
  | BusinessToBusiness -- 004
  | BillPayment -- 005
  | GovernmentPayment -- 006
  | Salary -- 007
  | Pension -- 008
  | UtilityBill -- 009
  | ECommerce -- 010
  | Other Text
  deriving (Eq, Show, Generic)

instance ToJSON RaastPurposeCode where
  toJSON PersonToPerson = toJSON ("001" :: Text)
  toJSON PersonToBusiness = toJSON ("002" :: Text)
  toJSON BusinessToPerson = toJSON ("003" :: Text)
  toJSON BusinessToBusiness = toJSON ("004" :: Text)
  toJSON BillPayment = toJSON ("005" :: Text)
  toJSON GovernmentPayment = toJSON ("006" :: Text)
  toJSON Salary = toJSON ("007" :: Text)
  toJSON Pension = toJSON ("008" :: Text)
  toJSON UtilityBill = toJSON ("009" :: Text)
  toJSON ECommerce = toJSON ("010" :: Text)
  toJSON (Other code) = toJSON code

instance FromJSON RaastPurposeCode where
  parseJSON = withText "RaastPurposeCode" $ \t -> case t of
    "001" -> pure PersonToPerson
    "002" -> pure PersonToBusiness
    "003" -> pure BusinessToPerson
    "004" -> pure BusinessToBusiness
    "005" -> pure BillPayment
    "006" -> pure GovernmentPayment
    "007" -> pure Salary
    "008" -> pure Pension
    "009" -> pure UtilityBill
    "010" -> pure ECommerce
    code -> pure (Other code)

-- | Raast payment request status
data RaastPaymentStatus
  = RaastPending
  | RaastVerified -- ZK proof verified
  | RaastSubmitted -- Submitted to Raast network
  | RaastCompleted
  | RaastFailed
  | RaastExpired
  deriving (Eq, Show, Generic, Enum, Bounded)

instance ToJSON RaastPaymentStatus

instance FromJSON RaastPaymentStatus

-- | Raast payment request with FHE encrypted amount
data RaastPaymentRequest = RaastPaymentRequest
  { _raastPaymentRequestId :: !UUID,
    _raastPaymentSenderIBAN :: !IBAN,
    _raastPaymentRecipientIBAN :: !IBAN,
    _raastPaymentSenderID :: !(Maybe RaastID),
    _raastPaymentRecipientID :: !(Maybe RaastID),
    _raastPaymentEncryptedAmount :: !FHEEncryptedAmount,
    _raastPaymentPurposeCode :: !RaastPurposeCode,
    _raastPaymentNarrative :: !(Maybe Text),
    _raastPaymentZKProof :: !(Maybe ByteString), -- ZK proof for validation
    _raastPaymentZKVerified :: !Bool,
    _raastPaymentStatus :: !RaastPaymentStatus,
    _raastPaymentTransactionId :: !(Maybe Text)
  }
  deriving (Eq, Show, Generic)

makeLenses ''RaastPaymentRequest

instance ToJSON RaastPaymentRequest

instance FromJSON RaastPaymentRequest

-- | Raast payment confirmation
data RaastPayment = RaastPayment
  { _raastConfirmationId :: !UUID,
    _raastConfirmationTransactionId :: !Text,
    _raastConfirmationReferenceNumber :: !(Maybe Text),
    _raastConfirmationBankReference :: !(Maybe Text),
    _raastConfirmationSettlementAmount :: !FHEEncryptedAmount,
    _raastConfirmationStatus :: !Text
  }
  deriving (Eq, Show, Generic)

makeLenses ''RaastPayment

instance ToJSON RaastPayment

instance FromJSON RaastPayment

makePrisms ''RaastID
makePrisms ''FHEScheme
makePrisms ''FHEOperationType
makePrisms ''RaastPurposeCode
makePrisms ''RaastPaymentStatus
