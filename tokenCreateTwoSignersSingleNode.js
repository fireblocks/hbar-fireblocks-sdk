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
	// a single node is selected to submit a transaction to
	// if this node is temporarily available, the transaction will fail to be
	// sent to the network
	const clientConfig = {
		apiKey: process.env.API_KEY,
		privateKey: process.env.PRIVATE_KEY_PATH,
		vaultAccountId: process.env.PRIMARY_VAULT_ACCOUNT_ID,
		testnet: true,
		apiEndpoint: ApiBaseUrl.Production,
		// specify a single node to sign transactions for
		maxNumberOfPayloadsPerTransaction: 1,
	};

	client = new FireblocksHederaClient(clientConfig);
	await client.init();

	// get the details of the signer (treasury) from the secondary vault
	const treasurySigner = await client.getSigner(process.env.SECONDARY_VAULT_ACCOUNT_ID);
	const treasuryAccountId = await treasurySigner.getFireblocksAccountId();
	const treasuryPublicKey = treasurySigner.getAccountKey();

	const transaction = new TokenCreateTransaction()
		.setTokenName("test")
		.setTokenSymbol("tst")
		.setInitialSupply(0)
		.setTreasuryAccountId(treasuryAccountId)
		.setTokenType(TokenType.FungibleCommon)
		.setSupplyKey(treasuryPublicKey);

	// Add second signatory to the transaction (treasury is separate from tx fee payer)
	await client.addSigner(process.env.SECONDARY_VAULT_ACCOUNT_ID);

	// sign the transaction with all signers and broadcast
	let txResponse = await transaction.execute(client);
	// Request the receipt of the transaction
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
