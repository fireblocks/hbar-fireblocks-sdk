import { TokenCreateTransaction, TokenType } from "@hashgraph/sdk";
import { FireblocksHederaClient } from "../src/FireblocksHederaClient";
import { ApiBaseUrl, FireblocksHederaClientConfig } from "../src/type";

let client: FireblocksHederaClient;

// code example for token creation transaction, examplifying the use case of working with two different wallets as signers and a single node limitation.

(async () => {
  const clientConfig: FireblocksHederaClientConfig = {
    apiKey: "YOUR_API_KEY_ID",
    privateKey: "/PATH/TO/API/SECRET/KEY",
    vaultAccountId: 0, // update the client's vault account id
    testnet: false,
    apiEndpoint: ApiBaseUrl.US,
    maxNumberOfPayloadsPerTransaction: 1,
  };
  client = new FireblocksHederaClient(clientConfig);
  await client.init();

  const clientSigner = await client.getSigner(clientConfig.vaultAccountId);
  const clientPublicKey = (await clientSigner.getAccountInfo()).key;

  const treasuryVaultId = 2;
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

  client.close();
})().catch((e) => {
  console.log("Failed to do something: ", e);
  console.error(e);
  console.log(JSON.stringify(e, null, 2));
  client.close();
});