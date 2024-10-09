const {
	TokenCreateTransaction, PrivateKey, TokenType, TokenMintTransaction
} = require('@hashgraph/sdk');
const { FireblocksHederaClient } = require('./dist/FireblocksHederaClient');
const { ApiBaseUrl } = require('./dist/type');

const dotenv = require('dotenv');
let client;

dotenv.config();

(async () => {

	// this example creates a fungible token with a public supply key which is
	// different to the signer's, both the signer and the supply key must sign
	// mint transactions
	// - The signer to approve the transaction fees
	// - The supply key to approve minting
	// multiple nodes are selected to submit a transaction to
	// if one of the selected nodes is temporarily available,
	// the sdk will attempt to submit the same transaction to another node
	// until successful, or it runs out of nodes to submit to
	const clientConfig = {
		apiKey: process.env.API_KEY,
		privateKey: process.env.PRIVATE_KEY_PATH,
		vaultAccountId: process.env.PRIMARY_VAULT_ACCOUNT_ID,
		testnet: true,
		apiEndpoint: ApiBaseUrl.Production,
		// do not limit nodes to sign transactions for
		// maxNumberOfPayloadsPerTransaction: 1,
	};

	client = new FireblocksHederaClient(clientConfig);
	await client.init();

	const signerAccountId = await client.getFireblocksAccountId();
	// const adminSigner = await client.getSigner(process.env.PRIMARY_VAULT_ACCOUNT_ID);
	// const pubKey = await client.getPublicKey();

	// generate a private key for the supply
	const supplyPrivateKey = PrivateKey.generateED25519();
	const supplyPublicKey = supplyPrivateKey.publicKey;

	let transaction = new TokenCreateTransaction()
		.setTokenName("test")
		.setTokenSymbol("tst")
		.setInitialSupply(0)
		.setTreasuryAccountId(signerAccountId)
		.setTokenType(TokenType.FungibleCommon)
		.setSupplyKey(supplyPublicKey);

	let txResponse = await transaction.execute(client);
	//Request the receipt of the transaction
	let receipt = await txResponse.getReceipt(client);
	//Get the transaction consensus status
	let transactionStatus = receipt.status;
	console.log(`Token Create Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	// now mint tokens, both signer and supply key (private) need to sign
	transaction = new TokenMintTransaction()
		.setTokenId(receipt.tokenId)
		.setAmount(100);

	// pre-sign, multi nodes = multiple transactions to sign
	await client.preSignTransaction(transaction);

	// sign with private supply key
	await transaction.sign(supplyPrivateKey);

	// execute
	txResponse = await transaction.execute(client);
	//Request the receipt of the transaction
	receipt = await txResponse.getReceipt(client);
	//Get the transaction consensus status
	transactionStatus = receipt.status;
	console.log(`Token Mint Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	client.close();

})().catch((e) => {
	console.log('Failed to do something: ', e);
	console.error(e);
	console.log(JSON.stringify(e, null, 2));
	if (client) {client.close();}
});
