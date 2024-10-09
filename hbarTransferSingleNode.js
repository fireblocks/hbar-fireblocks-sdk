const {
	Hbar, TransferTransaction
} = require('@hashgraph/sdk');
const { FireblocksHederaClient } = require('./dist/FireblocksHederaClient');
const { ApiBaseUrl } = require('./dist/type');

const dotenv = require('dotenv');
let client;

dotenv.config();

(async () => {

	// this example transfers hbar from the signer's account to 0.0.800
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

	const fromAccountId = await client.getFireblocksAccountId();
	// const adminSigner = await client.getSigner(process.env.PRIMARY_VAULT_ACCOUNT_ID);
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
