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
We take into account two potential use-cases as well as providing the signature caching functionality:

### Node count
Hedera SDK offers the ability to send the transaction to multiple nodes in a sequential order in case one does not accept. As such each transaction to a node has their own unique node id embeded in the transaction. This means that each transaction to a node needs to be different and requires its own signature. We offer two approaches to this matter;
1. Set the maximum number of nodes to one; this will make it so that when sending a transaction only a single node (determined by the Hedera's SDK's internal mechanisms), to do this use the `maxNumberOfPayloadsPerTransaction`:
    ```javascript
    const clientConfig = {
        apiKey: '01234567-89ab-cdef-0123-456789abcdef',
        privateKey: '/path/to/private/key',
        vaultAccountId: X,
        testnet: true,
        apiEndpoint: Y,
        maxNumberOfPayloadsPerTransaction: 1
    };
    ```

2. Use signature caching as described in the next section

### Signature Caching
Hedera's SDK provides the possibility to send a transaction to multiple nodes, to acheive this, each node gets its own transaction payload, differing in the node-id, but as a result each payload needs to be signed. To make this process easier, we provide a functionality which will freeze the node ids that will be used, and will sign all the payloads, to make the execution easier.

The following is an example of how to use this functionality;
```javascript
const clientConfig = {
    apiKey: '01234567-89ab-cdef-0123-456789abcdef',
    privateKey: '/path/to/private/key',
    vaultAccountId: X,
    testnet: true,
    apiEndpoint: Y,
};
const client = new FireblocksHederaClient(clientConfig);

// Create a transaction to transfer 1 HBAR
const transaction = new TransferTransaction()
    .addHbarTransfer(OPERATOR_ID, new Hbar(-1))
    .addHbarTransfer(newAccountId, new Hbar(1));

// Sign all the payloads ahead of time
await client.preSignTransaction(transaction);

//Submit the transaction to a Hedera network
const txResponse = await transaction.execute(client);

//Request the receipt of the transaction
const receipt = await txResponse.getReceipt(client);

//Get the transaction consensus status
const transactionStatus = receipt.status;

console.log('The transaction consensus status is ' + transactionStatus.toString());

//v2.0.0
```

### Standard Use-case

In this use-case we assume only a single signature is required, as such we provide a singular client which will sign the transaction.

To create the client:

```javascript
const clientConfig = {
    apiKey: '01234567-89ab-cdef-0123-456789abcdef',
    privateKey: '/path/to/private/key',
    vaultAccountId: X,
    testnet: true,
    apiEndpoint: Y,
};
const client = new FireblocksHederaClient(clientConfig);
```

**Note** - we suggest either using signature caching (see above) or set the maximum number of nodes to 1.


Once the client is created you can simply use it to execute transactions, for example (original source code taken from [here](https://docs.hedera.com/hedera/sdks-and-apis/sdks/accounts-and-hbar/transfer-cryptocurrency)):

```javascript
// Create a transaction to transfer 1 HBAR
const transaction = new TransferTransaction()
    .addHbarTransfer(OPERATOR_ID, new Hbar(-1))
    .addHbarTransfer(newAccountId, new Hbar(1));

//Submit the transaction to a Hedera network
const txResponse = await transaction.execute(client);

//Request the receipt of the transaction
const receipt = await txResponse.getReceipt(client);

//Get the transaction consensus status
const transactionStatus = receipt.status;

console.log('The transaction consensus status is ' + transactionStatus.toString());

//v2.0.0
```

This way, the client will sign the transaction but also perform all needed operations that are non-Fireblocks related.

### Multiple Signers

Some transactions in Hedera might require multiple signers, for example creating a token.

We first want to create a client, similar to how we did before:

```javascript
const clientConfig = {
    apiKey: '01234567-89ab-cdef-01234-56789abcdef0',
    privateKey: '/path/to/private/key',
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
    .setTokenName('Your Token Name')
    .setTokenSymbol('F')
    .setTreasuryAccountId(treasurySigner.getAccountId())
    .setInitialSupply(5000)
    .setAdminKey(adminPublicKey)
    .setMaxTransactionFee(new Hbar(30)) //Change the default max transaction fee
    .freezeWith(client);

//Sign the transaction with the token adminKey and the token treasury account private key
const signTx = await (await transaction.signWithSigner(adminSigner)).signWithSigner(treasurySigner);

//Sign the transaction with the client operator private key and submit to a Hedera network
const txResponse = await signTx.execute(client);

//Get the receipt of the transaction
const receipt = await txResponse.getReceipt(client);

//Get the token ID from the receipt
const tokenId = receipt.tokenId;

console.log('The new token ID is ' + tokenId);

//v2.0.5
```

### Multiple Signers with Signauture caching

As described above regarding multiple nodes, when creating a transaction that needs multiple signers, we want to sign the transaction in advance, before we perform the actual execute operation. To do this, we will call the `preSignTransaction` function which is available in the signers as well;
```javascript
const adminVaultAccountId = Z;
const adminSigner = await client.getSigner(adminVaultAccountId);
const adminPublicKey = (await adminSigner.getAccountInfo()).key;

const treasuryVaultAccountId = W;
const treasurySigner = await client.getSigner(treasuryVaultAccountId);

//Create the transaction
const transaction = await new TokenCreateTransaction()
    .setTokenName('Your Token Name')
    .setTokenSymbol('F')
    .setTreasuryAccountId(treasurySigner.getAccountId())
    .setInitialSupply(5000)
    .setAdminKey(adminPublicKey)
    .setMaxTransactionFee(new Hbar(30))
    .freezeWith(client); //Change the default max transaction fee
    

// Sign all the payloads ahead of time
await treasurySigner.preSignTransaction(transaction);
await adminSigner.preSignTransaction(transaction);
await client.preSignTransaction(transaction);

//Sign the transaction with the token adminKey and the token treasury account private key
const signTx = await (await transaction.signWithSigner(adminSigner)).signWithSigner(treasurySigner);

//Sign the transaction with the client operator private key and submit to a Hedera network
const txResponse = await signTx.execute(client);

//Get the receipt of the transaction
const receipt = await txResponse.getReceipt(client);

//Get the token ID from the receipt
const tokenId = receipt.tokenId;

console.log('The new token ID is ' + tokenId);

//v2.0.5
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
    apiEndpoint?: ApiBaseUrl;

    /**
     * Hedera SDK allows for signing the same transaction for multiple nodes. This allows us to
     * send the transaction to various nodes until one of them accepts it.
     * This means that for each payload we submit a raw signing transaction.
     * By default this is set to 1, if you wish to set it to some larger number, it's completely fine, however in that scenario we
     * suggest to pre-sign the transactions instead of using the standard notation.
     * @see FireblocksHederaSignerAdditionalFunctionality.preSignTransaction
     */
    maxNumberOfPayloadsPerTransaction?: number;
```
