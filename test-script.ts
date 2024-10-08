import {
  TokenType,
  TokenCreateTransaction,
  TokenId,
  TokenSupplyType,
  PublicKey,
  Hbar,
  PrivateKey,
  AccountId,
  TransferTransaction,
  TokenMintTransaction,
  AccountCreateTransaction,
  TokenAssociateTransaction,
  TokenFreezeTransaction,
  TokenUnfreezeTransaction,
  TokenBurnTransaction,
  TokenPauseTransaction,
  TokenUnpauseTransaction,
  TokenWipeTransaction,
  TokenUpdateTransaction,
} from "@hashgraph/sdk";
import { FireblocksHederaClient } from "./src/FireblocksHederaClient";
import { ApiBaseUrl, FireblocksHederaClientConfig } from "./src/type";
import dotenv from "dotenv";
dotenv.config();

// constants
const tokenName = "Hedera Test Token";
const tokenSymbol = "HTT";

// client config
const clientConfig: FireblocksHederaClientConfig = {
  apiKey: process.env.API_KEY || "",
  privateKey: "./privKey.key",
  vaultAccountId: 2,
  testnet: true,
  apiEndpoint: ApiBaseUrl.Production,
  maxNumberOfPayloadsPerTransaction: 1,
};

// token create function
async function createTokenTest(
  client: FireblocksHederaClient,
  isNFT: boolean,
  tokenConfig: any,
  customFees?: any
) {
  let transaction = new TokenCreateTransaction()
    .setTokenName(tokenName)
    .setTokenSymbol(tokenSymbol)
    .setInitialSupply(isNFT ? 0 : 5000)
    .setMaxTransactionFee(new Hbar(50));

  const signers = [];

  //@ts-ignore
  for (const [type, [pubKey, signer]] of Object.entries(tokenConfig)) {
    if (pubKey === undefined) continue;

    switch (type) {
      case "admin":
        transaction.setAdminKey(pubKey);
        break;
      case "wipe":
        transaction.setWipeKey(pubKey);
        break;
      case "freeze":
        transaction.setFreezeKey(pubKey);
        break;
      case "treasury":
        transaction.setTreasuryAccountId(pubKey);
        break;
      case "kyc":
        transaction.setKycKey(pubKey);
        break;
      case "pause":
        transaction.setPauseKey(pubKey);
        break;
      case "supply":
        transaction.setSupplyKey(pubKey);
        break;
      default:
        transaction.setFeeScheduleKey(pubKey);
        break;
    }

    if (signer !== undefined) {
      //@ts-ignore
      signers.push(signer);
    }
  }

  if (customFees) {
    transaction.setCustomFees(customFees);
  }

  if (isNFT) {
    transaction.setTokenType(TokenType.NonFungibleUnique);
  }

  for (const signer of signers) {
    //@ts-ignore
    await signer.preSignTransaction(transaction);
    transaction = await transaction.signWithSigner(signer);
  }

  // Sign the transaction with the client operator private key and submit to a Hedera network
  const txResponse = await transaction.execute(client);

  // Get the receipt of the transaction
  const receipt = await txResponse.getReceipt(client);

  // Get the token ID from the receipt
  const tokenId = receipt.tokenId;

  console.log(
    `The new token ID: ${tokenId} in transaction ${txResponse.transactionId.toString()}`
  );

  return tokenId;
  // v2.0.5
}

// create account
async function createNewAccount(
  client: FireblocksHederaClient,
  initialBalance: number
) {
  const newAccountPrivateKey = PrivateKey.generate();
  const newAccountPublicKey = newAccountPrivateKey.publicKey;

  const accountTransaction = new AccountCreateTransaction()
    .setKey(newAccountPublicKey)
    .setInitialBalance(new Hbar(initialBalance));

  const txResponse = await accountTransaction.execute(client);
  const receipt = await txResponse.getReceipt(client);
  const newAccountId = receipt.accountId;

  console.log(`New account created: ${newAccountId}`);
  return { newAccountId, newAccountPrivateKey };
}

// associate token to newly created account
async function associateTokenToAccount(
  client: FireblocksHederaClient,
  tokenId: string,
  accountId: AccountId,
  privateKey: PrivateKey
) {
  const associateTransaction = new TokenAssociateTransaction()
    .setAccountId(accountId)
    .setTokenIds([tokenId])
    .freezeWith(client);

  const signedAssociateTransaction = await associateTransaction.sign(privateKey);
  const associateResponse = await signedAssociateTransaction.execute(client);
  const receipt = await associateResponse.getReceipt(client);

  console.log(
    `Token ${tokenId} associated with account ${accountId}: ${receipt.status}`
  );
}

// transfer tokens
async function transferToken(
  client: FireblocksHederaClient,
  tokenId: string,
  senderAccountId: AccountId,
  receiverAccountId: AccountId,
  amount: number
) {
  const transferTransaction = new TransferTransaction()
    .addTokenTransfer(tokenId, senderAccountId, -amount)
    .addTokenTransfer(tokenId, receiverAccountId, amount);

  const txResponse = await transferTransaction.execute(client);
  const receipt = await txResponse.getReceipt(client);

  console.log(
    `Transferred ${amount} tokens of ${tokenId} to ${receiverAccountId}: ${receipt.status}`
  );
}

// transfer hbar
async function transferHbar(
  client: FireblocksHederaClient,
  senderAccountId: AccountId,
  receiverAccountId: AccountId,
  amount: number
) {
  const transferTransaction = new TransferTransaction()
    .addHbarTransfer(senderAccountId, new Hbar(-amount))
    .addHbarTransfer(receiverAccountId, new Hbar(amount));

  const txResponse = await transferTransaction.execute(client);
  const receipt = await txResponse.getReceipt(client);

  console.log(
    `Transferred ${amount} HBAR to ${receiverAccountId}: ${receipt.status}`
  );
}

// create NFT
async function createNFT(
  client: FireblocksHederaClient,
  tokenName: string,
  symbol: string,
  treasuryAccountId: AccountId,
  adminKey: PublicKey
) {
  const nftCreateTransaction = new TokenCreateTransaction()
    .setTokenName(tokenName)
    .setTokenSymbol(symbol)
    .setTokenType(TokenType.NonFungibleUnique)
    .setTreasuryAccountId(treasuryAccountId)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(5000)
    .setAdminKey(adminKey)
    .setFreezeKey(adminKey)
    .setWipeKey(adminKey)
    .setSupplyKey(adminKey)
    .setFeeScheduleKey(adminKey)
    .setInitialSupply(0)
    .setMaxTransactionFee(new Hbar(50));

  const nftCreateTx = await nftCreateTransaction.execute(client);
  const receipt = await nftCreateTx.getReceipt(client);
  const tokenId = receipt.tokenId;

  console.log(`Created NFT with token ID: ${tokenId}`);
  return tokenId;
}

// mint NFT
async function mintNFT(
  client: FireblocksHederaClient,
  tokenId: TokenId,
  metadata: Uint8Array[]
) {
  const mintTransaction = new TokenMintTransaction()
    .setTokenId(tokenId)
    .setMetadata(metadata);

  const mintTx = await mintTransaction.execute(client);
  const receipt = await mintTx.getReceipt(client);

  console.log(`Minted NFT: ${receipt.status}`);
}

// -----------------
// Token operations
// -----------------

// freeze token
async function freezeToken(
  client: FireblocksHederaClient,
  tokenId: TokenId,
  accountId: AccountId
) {
  const freezeTransaction = new TokenFreezeTransaction()
    .setTokenId(tokenId)
    .setAccountId(accountId);

  await freezeTransaction.execute(client);
  console.log(`Frozen token ${tokenId} for account ${accountId}`);
}

// unfreeze token
async function unfreezeToken(
  client: FireblocksHederaClient,
  tokenId: TokenId,
  accountId: AccountId
) {
  const unfreezeTransaction = new TokenUnfreezeTransaction()
    .setTokenId(tokenId)
    .setAccountId(accountId);

  await unfreezeTransaction.execute(client);
  console.log(`Unfrozen token ${tokenId} for account ${accountId}`);
}

// burn token
async function burnToken(
  client: FireblocksHederaClient,
  tokenId: TokenId,
  amount: number
) {
  const burnTransaction = new TokenBurnTransaction()
    .setTokenId(tokenId)
    .setAmount(amount);

  await burnTransaction.execute(client);
  console.log(`Burned ${amount} tokens for ${tokenId}`);
}

// pause token
async function pauseToken(client: FireblocksHederaClient, tokenId: TokenId) {
  const pauseTransaction = new TokenPauseTransaction().setTokenId(tokenId);
  await pauseTransaction.execute(client);
  console.log(`Paused token ${tokenId}`);
}

// unpause token
async function unpauseToken(client: FireblocksHederaClient, tokenId: TokenId) {
  const unpauseTransaction = new TokenUnpauseTransaction().setTokenId(tokenId);
  await unpauseTransaction.execute(client);
  console.log(`Unpaused token ${tokenId}`);
}

// wipe token
async function wipeToken(
  client: FireblocksHederaClient,
  tokenId: TokenId,
  accountId: AccountId,
  amount: number
) {
  const wipeTransaction = new TokenWipeTransaction()
    .setTokenId(tokenId)
    .setAccountId(accountId)
    .setAmount(amount);

  await wipeTransaction.execute(client);
  console.log(`Wiped ${amount} tokens from account ${accountId}`);
}

// update token
async function updateToken(
  client: FireblocksHederaClient,
  tokenId: TokenId,
  newTokenName: string
) {
  const updateTransaction = new TokenUpdateTransaction()
    .setTokenId(tokenId)
    .setTokenName(newTokenName);

  await updateTransaction.execute(client);
  console.log(`Updated token ${tokenId} to new name: ${newTokenName}`);
}

// create token with multi-signature
async function createTokenMultiSig(client: FireblocksHederaClient) {
  const treasurySigner = await client.getSigner(3);
  const treasuryPublicKey = treasurySigner.getAccountKey();
  const clientSigner = await client.getSigner(clientConfig.vaultAccountId);

  const transaction = await new TokenCreateTransaction()
    .setTokenName("MultiSigToken")
    .setTokenSymbol("MST")
    .setTreasuryAccountId(treasurySigner.getAccountId())
    .setInitialSupply(5000)
    .setSupplyKey(treasuryPublicKey)
    .setMaxTransactionFee(new Hbar(30))
    .freezeWith(client);

  // sign the transaction with the token adminKey and the token treasury account private key
  const signTx = await (await transaction.signWithSigner(clientSigner)).signWithSigner(
    treasurySigner
  );

  const txResponse = await signTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  const tokenId = receipt.tokenId;

  console.log("The new token ID is " + tokenId);
}

// create token with multi-signature caching
async function createTokenMultiSigCaching(client: FireblocksHederaClient) {
  const adminSigner = await client.getSigner(0);
  const adminPublicKey = (await adminSigner.getAccountInfo()).key;
  const treasurySigner = await client.getSigner(3);

  const transaction = await new TokenCreateTransaction()
    .setTokenName("MultiSigTokenCaching")
    .setTokenSymbol("MSTC")
    .setTreasuryAccountId(treasurySigner.getAccountId())
    .setInitialSupply(5000)
    .setAdminKey(adminPublicKey)
    .setMaxTransactionFee(new Hbar(30)); 

  //@ts-ignore
  await treasurySigner.preSignTransaction(transaction);
  //@ts-ignore
  await adminSigner.preSignTransaction(transaction);
  //@ts-ignore
  await client.preSignTransaction(transaction);

  // Sign the transaction with the token adminKey and the token treasury account private key
  const signTx = await (await transaction.signWithSigner(adminSigner)).signWithSigner(
    treasurySigner
  );

  const txResponse = await signTx.execute(client);
  const receipt = await txResponse.getReceipt(client);
  const tokenId = receipt.tokenId;

  console.log("The new token ID is " + tokenId);
}

// --------------
// Main function
// --------------
(async () => {
  const client = new FireblocksHederaClient(clientConfig);
  await client.init();

  const clientAccountId = (await client.getFireblocksAccountId()).toString();
  const signer = await client.getSigner(clientConfig.vaultAccountId);
  const pubKey = await client.getPublicKey();

  try {
    const tokenConfiguration = {
      admin: [pubKey, signer],
      treasury: [clientAccountId, undefined],
    };

    // create fungible token
    const tokenId = await createTokenTest(client, false, tokenConfiguration);

    // create new account
    const { newAccountId, newAccountPrivateKey } = await createNewAccount(
      client,
      10
    );

    if (newAccountId && tokenId) {
      // associate token to newly created account
      await associateTokenToAccount(
        client,
        tokenId.toString(),
        newAccountId,
        newAccountPrivateKey
      );

      // transfer fungible tokens to new account
      await transferToken(
        client,
        tokenId.toString(),
        AccountId.fromString(clientAccountId),
        newAccountId,
        100
      );

      // transfer hbar
      await transferHbar(
        client,
        AccountId.fromString(clientAccountId),
        newAccountId,
        50
      );

      // create NFT
      const nftTokenId = await createNFT(
        client,
        "UniqueArtwork",
        "ART",
        AccountId.fromString(clientAccountId),
        pubKey
      );

      if (nftTokenId) {
        // mint NFT
        const metadata = [
          new Uint8Array([0x01, 0x02, 0x03]),
        ]; // dummy metadata - replace with actual IPFS string
        await mintNFT(client, nftTokenId, metadata);
      }

      // token operations
      await freezeToken(client, tokenId, newAccountId);
      await unfreezeToken(client, tokenId, newAccountId);
      await burnToken(client, tokenId, 50);
      await pauseToken(client, tokenId);
      await unpauseToken(client, tokenId);
      await wipeToken(client, tokenId, newAccountId, 10);
      await updateToken(client, tokenId, "Some new name");

      // multi-signature check
      await createTokenMultiSig(client);
      await createTokenMultiSigCaching(client);
    }
  } catch (e) {
    console.log("Failed to do something: ", e);
  } finally {
    client.close();
  }
})();