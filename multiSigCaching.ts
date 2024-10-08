import {
    TokenCreateTransaction,
    Hbar,
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
    apiEndpoint: ApiBaseUrl.Production
  };
  
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
        await createTokenMultiSigCaching(client);
      // }
    } catch (e) {
      console.log("Failed to do something: ", e);
    } finally {
      client.close();
    }
  })();