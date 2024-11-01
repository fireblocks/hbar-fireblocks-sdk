import {
    TokenType,
    TokenCreateTransaction,
    TransferTransaction,
    Hbar
  } from "@hashgraph/sdk";
  import { FireblocksHederaClient } from "./src/FireblocksHederaClient";
  import { ApiBaseUrl, FireblocksHederaClientConfig } from "./src/type";
  import dotenv from "dotenv";
  dotenv.config();

  // client config
  const clientConfig: FireblocksHederaClientConfig = {
    apiKey: process.env.API_KEY || "",
    privateKey: "./privKey.key",
    vaultAccountId: 2,
    testnet: true,
    apiEndpoint: ApiBaseUrl.Production,
  };

  // create token with multi-signature - multi node
  async function createTokenTwoSignersMultiNode(client: FireblocksHederaClient) {
    const clientSigner = await client.getSigner(clientConfig.vaultAccountId);
    const clientPublicKey = (await clientSigner.getAccountInfo()).key;
  
    const treasuryVaultId = 1; // update the treasury vault account id
  
    const treasurySigner = await client.getSigner(treasuryVaultId);
    const treasuryAccountId = await client.getFireblocksAccountId();
  
    const treasuryPublicKey = treasurySigner?.getAccountKey?.();
  
    const transaction = new TokenCreateTransaction()
      .setTokenName("testToken")
      .setTokenSymbol("tst")
      .setInitialSupply(10)
      .setAdminKey(clientPublicKey)
      .setTreasuryAccountId(treasuryAccountId)
      .setTokenType(TokenType.FungibleCommon)
      .setSupplyKey(treasuryPublicKey!);
  
    // add the second signer - the treasury account
    await client.addSigner(`${treasuryVaultId}`);
  
    let txResponse = await transaction.execute(client);
    //Request the receipt of the transaction
    let receipt = await txResponse.getReceipt(client);
    //Get the transaction consensus status
    let transactionStatus = receipt.status;
    console.log(
      `Token Create Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`
    );
  }

          // create hbar transfer multi node
    async function hbarTransferMultiNode(client: FireblocksHederaClient) {
        const fromAccountId = await client.getFireblocksAccountId();
        const amount = new Hbar(1);
        const destAddress = process.env.RECIPIENT || ""; 
      
        const transaction = new TransferTransaction()
            .addHbarTransfer(fromAccountId, amount.negated())
            .addHbarTransfer(destAddress, amount);
        const txResponse = await transaction.execute(client);
        //Request the receipt of the transaction
        const receipt = await txResponse.getReceipt(client);
        //Get the transaction consensus status
        const transactionStatus = receipt.status;
        console.log(
            `Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`
        );
      }

  // ------------------
  // Main function
  // ------------------
  (async () => {
    const client = new FireblocksHederaClient(clientConfig);
    await client.init();
  
    try {

        await createTokenTwoSignersMultiNode(client);
        await hbarTransferMultiNode(client);

    } catch (e) {
      console.log("Failed to do something: ", e);
    } finally {
      client.close();
    }
  })();
  