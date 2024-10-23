const {
	Hbar, TransferTransaction, PublicKey
} = require('@hashgraph/sdk');
const { FireblocksHederaClient } = require('./dist/FireblocksHederaClient');
const { ApiBaseUrl } = require('./dist/type');

const dotenv = require('dotenv');
let client;

dotenv.config();

(async () => {

	// this example transfers hbar from the signer's account to 0.0.800
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

	const fromAccountId = await client.getFireblocksAccountId();
	// const pubKey = await client.getPublicKey();

	const amount = new Hbar(1);

	// transfer 1 Hbar from the signer's account to 0.0.800 which is the staking rewards account
	const transaction = new TransferTransaction()
		.addHbarTransfer(fromAccountId, amount.negated())
		.addHbarTransfer("0.0.800", amount);

	const txResponse = await transaction.execute(client);
	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);
	//Get the transaction consensus status
	const transactionStatus = receipt.status;
	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	client.close();

})().catch((e) => {
	console.log('Failed to do something: ', e);
	console.error(e);
	console.log(JSON.stringify(e, null, 2));
	if (client) {client.close();}
});
