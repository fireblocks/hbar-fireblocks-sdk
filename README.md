# Fireblocks Hedera SDK Client and Signer

This repo contains an implementation of an hedera Client that is used for signing operations with the Fireblocks SDK.
The implementation in this repo follows [HIP-338](https://hips.hedera.com/hip/hip-338).<br/>
**The implementation is a wrapper for Raw Signing**, handling all the raw signing calls required to abstract it and make for an easy and seamless integration with Fireblocks and the Hedera SDK

## Requirements

To use this Client you will need the following:

1. Raw signing enabled on the workspace
2. A Fireblocks API User
3. A vault account with the corresponding HBAR or HBAR_TEST wallet
4. Some funds in your relevant wallet

## How does it work

This SDK provides two functionalities depending on what is needed;

1. Client - an HIP-338 client which extends Hedera's standard client (Node client by default) and provides signing functionality so it can be easily integrated into existing code
2. Signer - an HIP-338 signer that can be used in case of multi-signature operations

The Client we provide simply extends Hedera's client. Once a signature is required, the Fireblocks SDK will request a signature and provide the result to the caller.<br/>
By default Hedera uses several nodes, each node requires a custom payload (with relevant node ID information) to be signed, and as a result we offer a caching signing mechanism, please see the signature caching below.

## How to use the SDK

The primary focus of the SDK is to provide an easily implmentable approach to use the Fireblocks SDK with Hedera's SDK.
We take into account two potential use-cases:

### Node count

Hedera SDK offers the ability to send the transaction to multiple nodes in a sequential order in case one does not accept. As such each transaction to a node has their own unique node id embeded in the transaction. This means that each transaction to a node needs to be different and requires its own signature.

Set the maximum number of nodes to one; this will make it so that when sending a transaction only a single node (determined by the Hedera's SDK's internal mechanisms), to do this use the `maxNumberOfPayloadsPerTransaction` parameter as part of your `clientConfig`:

```javascript
const clientConfig = {
  apiKey: "01234567-89ab-cdef-0123-456789abcdef",
  privateKey: "/path/to/private/key",
  vaultAccountId: X,
  testnet: true,
  apiEndpoint: Y,
  maxNumberOfPayloadsPerTransaction: 1,
};
```

### Standard Use-case

In this use-case we assume only a single signer is required, as such we provide a singular client which will sign the transaction.

To create the client:

```javascript
const clientConfig = {
  apiKey: "01234567-89ab-cdef-0123-456789abcdef",
  privateKey: "/path/to/private/key",
  vaultAccountId: X,
  testnet: true,
  apiEndpoint: Y,
};
const client = new FireblocksHederaClient(clientConfig);
```

Once the client is created you can simply use it to execute transactions, for example (original source code taken from [here](https://docs.hedera.com/hedera/sdks-and-apis/sdks/accounts-and-hbar/transfer-cryptocurrency)):

```javascript
const fromAccountId = await client.getFireblocksAccountId();
const amount = new Hbar(1);
const destAddress = "0.0.1234";

// Create a transaction to transfer 1 HBAR
const transaction = new TransferTransaction()
  .addHbarTransfer(fromAccountId, amount.negated())
  .addHbarTransfer(destAddress, amount);

//Submit the transaction to a Hedera network
const txResponse = await transaction.execute(client);

//Request the receipt of the transaction
const receipt = await txResponse.getReceipt(client);

//Get the transaction consensus status
const transactionStatus = receipt.status;

console.log(
  `Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`
);

//v2.0.0
```

This way, the client will sign the transaction and perform all needed operations that are non-Fireblocks related.

### Multiple Signers

Some transactions in Hedera might require multiple signers, for example creating a token.

We first want to create a client, similar to how we did before:

```javascript
const clientConfig = {
  apiKey: "01234567-89ab-cdef-01234-56789abcdef0",
  privateKey: "/path/to/private/key",
  vaultAccountId: X,
  testnet: true,
  apiEndpoint: Y,
};
const client = new FireblocksHederaClient(clientConfig);
```

Once created, we want to create signers that will be used for the different vault accoutns we need signatures from, this can be done with a custom function called `getSigner` we added to our provided client:

```javascript
const adminVaultAccountId = Z;
const adminSigner = await client.getSigner(adminVaultAccountId);
const adminPublicKey = (await adminSigner.getAccountInfo()).key;

const treasuryVaultAccountId = W;
const treasurySigner = await client.getSigner(treasuryVaultAccountId);
```

Finally, you can use the provided client and signers to execute the transaction(code taken from [here](https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/define-a-token));<br/>
**Note** - the below code is slightly changed:

1. The `sign` function calls is replaced with `signWithSigner` function calls.
2. the `adminPublicKey` uses the above value instead of some inline value

```javascript
//Create the transaction and freeze for manual signing
const transaction = await new TokenCreateTransaction()
  .setTokenName("Your Token Name")
  .setTokenSymbol("F")
  .setTreasuryAccountId(treasurySigner.getAccountId())
  .setInitialSupply(5000)
  .setAdminKey(adminPublicKey)
  .setMaxTransactionFee(new Hbar(30)); //Change the default max transaction fee

// Add the signers to the client, this can be done multiple times if more than 2 signers are needed
await client.addSigner(`${adminVaultAccountId}`);
await client.addSigner(`${treasuryVaultAccountId}`);

// sign the transaction with all signers and broadcast, the execute method will also cache the signatures if multiuple nodes are configured in the client config
let txResponse = await transaction.execute(client);

//Get the receipt of the transaction
const receipt = await txResponse.getReceipt(client);

//Get the token ID from the receipt
const tokenId = receipt.tokenId;

console.log(
  `Token Create Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`
);

//v2.0.5
```

## Example files

Included in this SDK are [four example files](./examples) showcasing different use cases:

- **HBAR Transfer** - Using the SDK with a single signer AND limiting the number of nodes to one.
- **HBAR Transfer** - Using the SDK with a single signer AND no limit to the number of nodes.
- **Token Creation** - Using the SDK with two signers AND limiting the number of nodes to one.
- **Token Creation** - Using the SDK with two signers AND no limit to the number of nodes.

### How to run the example scripts

1. Clone the repo
2. Install the dependencies

```
npm install
```

3. Update the client config parameters
4. Run the example script

```
npx ts-node examples/script-name.ts
```

**OR**

```
npm run example01
npm run example02
npm run example03
npm run example04
```

### Successful execution

**HBAR Transfer**

```

Transaction 0.0.4363872@1730366816.250676454 finished with SUCCESS

```

**Token Creation**

```

Token Create Transaction 0.0.4338434@1730471891.681xxx finished with SUCCESS

```

## Configuration

The following is the configuration used for the Fireblocks Hedera client setup:

```javascript
    /**
     * The API User's private key's path
     */
    privateKey: string;

    /**
     * The API User's API key
     */
    apiKey: string;

    /**
     * The vault account to use
     */
    vaultAccountId: number;

    /**
     * Is it testnet
     */
    testnet?: boolean;

    /**
     * The API Endpoint to use, if such is relevant (sandbox, production, etc.)
     */
    apiEndpoint?: BasePath;

    /**
     * Hedera SDK allows for signing the same transaction for multiple nodes. This allows us to
     * send the transaction to various nodes until one of them accepts it.
     * This means that for each payload we submit a raw signing transaction.
     * If not specified in the clientConfig, the default will be multiple node transactions.
     */
    maxNumberOfPayloadsPerTransaction?: number;
```

##License

MIT
