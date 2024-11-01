import {
    TokenType,
    TokenCreateTransaction,
    TransferTransaction,
    Hbar,
  } from "@hashgraph/sdk";
  import { FireblocksHederaClient } from "./src/FireblocksHederaClient";
  import { ApiBaseUrl, FireblocksHederaClientConfig } from "./src/type";
  import dotenv from "dotenv";
  dotenv.config();
  
  // client config for multi-node
  const clientConfigMultiNode: FireblocksHederaClientConfig = {
    apiKey: process.env.API_KEY || "",
    privateKey: "./privKey.key",
    vaultAccountId: 2,
    testnet: true,
    apiEndpoint: ApiBaseUrl.Production,
  };
  
  // client config for single-node
  const clientConfigSingleNode: FireblocksHederaClientConfig = {
    apiKey: process.env.API_KEY || "",
    privateKey: "./privKey.key",
    vaultAccountId: 2,
    testnet: true,
    apiEndpoint: ApiBaseUrl.Production,
    maxNumberOfPayloadsPerTransaction: 1,
  };
  
  // create token with multi-signature - multi node
  async function createTokenTwoSignersMultiNode(client: FireblocksHederaClient) {
    const clientSigner = await client.getSigner(clientConfigMultiNode.vaultAccountId);
    const clientPublicKey = (await clientSigner.getAccountInfo()).key;
  
    const treasuryVaultId = 2; 
    const treasurySigner = await client.getSigner(treasuryVaultId);
    const treasuryAccountId = await client.getFireblocksAccountId();
    const treasuryPublicKey = await treasurySigner.getAccountKey();
  
    const transaction = new TokenCreateTransaction()
      .setTokenName("testToken")
      .setTokenSymbol("tst")
      .setInitialSupply(10)
      .setAdminKey(clientPublicKey)
      .setTreasuryAccountId(treasuryAccountId)
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyKey(treasuryPublicKey);
  
    // add second signer - treasury account
    await client.addSigner(`${treasuryVaultId}`);
  
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const transactionStatus = receipt.status;
    console.log(
      `Token Create Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`
    );
  }
  
  // create hbar transfer multi node
  async function hbarTransferMultiNode(client: FireblocksHederaClient) {
    const fromAccountId = await client.getFireblocksAccountId();
    const amount = new Hbar(1);
    const destAddress = process.env.RECIPIENT;
  
    if (typeof destAddress !== "string") {
      throw new Error("RECIPIENT environment variable is not set.");
    }
  
    const transaction = new TransferTransaction()
      .addHbarTransfer(fromAccountId, amount.negated())
      .addHbarTransfer(destAddress, amount);
    const txResponse = await transaction.execute(client);

    const receipt = await txResponse.getReceipt(client);

    const transactionStatus = receipt.status;
    console.log(
      `Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`
    );
  }
  
  // create token with multi-signature - single node
  async function createTokenTwoSignersSigSingleNode(client: FireblocksHederaClient) {
    const clientSigner = await client.getSigner(clientConfigSingleNode.vaultAccountId);
    const clientPublicKey = (await clientSigner.getAccountInfo()).key;
  
    const treasuryVaultId = 2; 
    const treasurySigner = await client.getSigner(treasuryVaultId);
    const treasuryAccountId = await client.getFireblocksAccountId();
    const treasuryPublicKey = await treasurySigner.getAccountKey();
  
    const transaction = new TokenCreateTransaction()
      .setTokenName("testToken")
      .setTokenSymbol("tst")
      .setInitialSupply(10)
      .setAdminKey(clientPublicKey)
      .setTreasuryAccountId(treasuryAccountId)
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyKey(treasuryPublicKey);
  
    await client.addSigner(`${treasuryVaultId}`);
  
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const transactionStatus = receipt.status;
    console.log(
      `Token Create Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`
    );
  }
  
  // create hbar transfer single node
  async function hbarTransferSingleNode(client: FireblocksHederaClient) {
    const fromAccountId = await client.getFireblocksAccountId();
    const amount = new Hbar(1);
    const destAddress = process.env.RECIPIENT;
  
    if (typeof destAddress !== "string") {
      throw new Error("RECIPIENT environment variable is not set.");
    }
  
    const transaction = new TransferTransaction()
      .addHbarTransfer(fromAccountId, amount.negated())
      .addHbarTransfer(destAddress, amount);
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const transactionStatus = receipt.status;
    console.log(
      `Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`
    );
  }
  
  // ------------------
  // Main function
  // ------------------
  (async () => {
    // multi-node operations
    const clientMultiNode = new FireblocksHederaClient(clientConfigMultiNode);
    await clientMultiNode.init();
  
    try {
      await createTokenTwoSignersMultiNode(clientMultiNode);
      await hbarTransferMultiNode(clientMultiNode);
    } catch (e) {
      console.log("Failed to do something in multi-node operations: ", e);
    } finally {
      clientMultiNode.close();
    }
  
    // single-node operations
    const clientSingleNode = new FireblocksHederaClient(clientConfigSingleNode);
    await clientSingleNode.init();
  
    try {
      await createTokenTwoSignersSigSingleNode(clientSingleNode);
      await hbarTransferSingleNode(clientSingleNode);
    } catch (e) {
      console.log("Failed to do something in single-node operations: ", e);
    } finally {
      clientSingleNode.close();
    }
  })();
  