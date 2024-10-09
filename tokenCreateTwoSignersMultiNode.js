const {
	TokenCreateTransaction, TokenType
} = require('@hashgraph/sdk');
const { FireblocksHederaClient } = require('./dist/FireblocksHederaClient');
const { ApiBaseUrl } = require('./dist/type');

const dotenv = require('dotenv');
let client;

dotenv.config();

(async () => {

	// this example creates a fungible token with a treasury account id which
	// different to the signer's (different vault), both the signer and
	// the treasury account owner must sign the token creation transaction
	// - The signer to approve the transaction fees
	// - The treasury account to approve being treasury
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

	// approves transaction fees
	// the treasury account + supply manager
	const transactionFeeSigner = await client.getSigner(process.env.PRIMARY_VAULT_ACCOUNT_ID);
	const treasurySigner = await client.getSigner(process.env.SECONDARY_VAULT_ACCOUNT_ID);
	const treasuryAccountId = await client.getFireblocksAccountId();
	const treasuryPublicKey = treasurySigner.getAccountKey();

	const transaction = new TokenCreateTransaction()
		.setTokenName("test")
		.setTokenSymbol("tst")
		.setInitialSupply(0)
		.setTreasuryAccountId(treasuryAccountId)
		.setTokenType(TokenType.FungibleCommon)
		.setSupplyKey(treasuryPublicKey)
		.freezeWith(client);

	// // pre-sign, multi nodes = multiple transactions to sign
	// // with treasury account
	await treasurySigner.preSignTransaction(transaction);
	// // with transaction fee payer
	await transactionFeeSigner.preSignTransaction(transaction);

	let txResponse = await transaction.execute(client);
	//Request the receipt of the transaction
	let receipt = await txResponse.getReceipt(client);
	//Get the transaction consensus status
	let transactionStatus = receipt.status;
	console.log(`Token Create Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	client.close();

})().catch((e) => {
	console.log('Failed to do something: ', e);
	console.error(e);
	console.log(JSON.stringify(e, null, 2));
	if (client) {client.close();}
});
