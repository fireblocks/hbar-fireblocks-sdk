const {
	TokenAssociateTransaction,
	AccountBalanceQuery,
	TransferTransaction,
	TokenCreateTransaction,
	Hbar,
	CustomFee,
	TokenFreezeTransaction,
	TokenUnfreezeTransaction,
	TokenGrantKycTransaction,
	TokenRevokeKycTransaction,
	TokenMintTransaction,
	TokenBurnTransaction,
	TokenPauseTransaction,
	TokenUnpauseTransaction,
	TokenWipeTransaction,
	TokenUpdateTransaction,
	TransactionId,
	Timestamp,
	Cache,
	AccountId,
	TokenDeleteTransaction,
	CustomFixedFee,
	CustomRoyaltyFee,
	TokenType,
	TokenFeeScheduleUpdateTransaction,
	TokenInfoQuery,
	AccountUpdateTransaction,
	NftId,
	TokenId,
	TokenDissociateTransaction
} = require('@hashgraph/sdk');
const { FireblocksHederaClient } = require('./dist/FireblocksHederaClient');


/**
 * Associates a token with a given account
 * @param {string} accountId - the account Id to associate with
 * @param {string[]} tokenId - the token Ids to associate with the account
 * @param {FireblocksHederaClient} client - the client to execute the transaction with
 * Source - https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/associate-tokens-to-an-account
 */
async function associateToken(accountId, tokenIds, client) {
	//Associate a token to an account and freeze the unsigned transaction for signing
	const transaction = new TokenAssociateTransaction().setAccountId(accountId).setTokenIds(tokenIds);

	if (PRE_SIGN_TX) {
		client.preSignTransaction(transaction);
	}

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	return txResponse.transactionId.toString();
}

async function transferTokenAndNFT(tokenId, nftId, sourceId, destinationId, tokenAmount, client) {
	//Create the transfer transaction
	const transaction = new TransferTransaction()
		.addTokenTransfer(tokenId, sourceId, -1 * tokenAmount)
		.addTokenTransfer(tokenId, destinationId, tokenAmount)
		.addNftTransfer(nftId, sourceId, destinationId);

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Obtain the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} resulted in ${transactionStatus.toString()} response`);

	return txResponse.transactionId.toString();

	//v2.0.5
}

async function transferToken(tokenId, sourceId, destinationId, tokenAmount, client) {
	//Create the transfer transaction
	const transaction = new TransferTransaction().addTokenTransfer(tokenId, sourceId, -1 * tokenAmount).addTokenTransfer(tokenId, destinationId, tokenAmount);

	if (PRE_SIGN_TX) {
		client.preSignTransaction(transaction);
	}
	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Obtain the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} resulted in ${transactionStatus.toString()} response`);

	return txResponse.transactionId.toString();

	//v2.0.5
}

async function createToken(
	tokenName,
	tokenSymbol,
	treasuryAccountId,
	treasurySigner,
	adminPublicKey,
	adminSigner,
	kycPublicKey,
	kycSigner,
	freezePublicKey,
	freezeSigner,
	pausePublicKey,
	pauseSigner,
	supplyPublicKey,
	supplySigner,
	wipePublicKey,
	wipeSigner,
	feeSchedulePublicKey,
	feeScheduleSigner,
	customFees,
	isNFT,
	client
) {
	//Create the transaction and freeze for manual signing
	if (!adminPublicKey || !treasuryAccountId) {
		throw new Error('Must provide admin public key or treasury Account Id');
	}
	const signers = [];
	let transaction = new TokenCreateTransaction()
		.setTokenName(tokenName)
		.setTokenSymbol(tokenSymbol)
		.setTreasuryAccountId(treasuryAccountId)
		.setInitialSupply(isNFT ? 0 : 5000)
		.setAdminKey(adminPublicKey)
		.setMaxTransactionFee(new Hbar(30)); //Change the default max transaction fee

	if (isNFT) {
		transaction.setTokenType(TokenType.NonFungibleUnique);
	}
	if (treasurySigner) signers.push(treasurySigner);
	if (kycPublicKey) {
		transaction = transaction.setKycKey(kycPublicKey);
		if (kycSigner) signers.push(kycSigner);
	}
	if (freezePublicKey) {
		transaction = transaction.setFreezeKey(freezePublicKey);
		if (freezeSigner) signers.push(freezeSigner);
	}
	if (pausePublicKey) {
		transaction = transaction.setPauseKey(pausePublicKey);
		if (pauseSigner) signers.push(pauseSigner);
	}
	if (supplyPublicKey) {
		transaction = transaction.setSupplyKey(supplyPublicKey);
		if (supplySigner) signers.push(supplySigner);
	}
	if (wipePublicKey) {
		transaction = transaction.setWipeKey(wipePublicKey);
		if (wipeSigner) signers.push(wipeSigner);
	}
	if (feeSchedulePublicKey) {
		transaction = transaction.setFeeScheduleKey(feeSchedulePublicKey);
		if (feeScheduleSigner) signers.push(feeScheduleSigner);
	}

	if (customFees) {
		transaction = transaction.setCustomFees(customFees);
	}
	transaction = transaction.freezeWith(client);

	for (const signer of signers) {
		transaction = await transaction.signWithSigner(signer);
	}

	//Sign the transaction with the token adminKey and the token treasury account private key
	const signTx = await transaction.signWithSigner(treasurySigner);

	//Sign the transaction with the client operator private key and submit to a Hedera network
	const txResponse = await signTx.execute(client);

	//Get the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the token ID from the receipt
	const tokenId = receipt.tokenId;

	console.log(`The new token ID: ${tokenId} in transaction ${txResponse.transactionId.toString()}`);

	return tokenId;
	//v2.0.5
}

async function freezeOrUnfreezeAccountForToken(accountId, tokenId, freeze, freezeSigner, client) {
	//Freeze an account from transferring a token
	const transaction = new (freeze ? TokenFreezeTransaction : TokenUnfreezeTransaction)().setAccountId(accountId).setTokenId(tokenId).freezeWith(client);

	//Sign with the freeze key of the token
	const signTx = await transaction.signWithSigner(freezeSigner);

	//Submit the transaction to a Hedera network
	const txResponse = await signTx.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	//v2.0.7
}

async function grantOrRevokeKYCAccount(accountId, tokenId, grant, grantSigner, client) {
	//Enable KYC flag on account and freeze the transaction for manual signing
	const transaction = new (grant ? TokenGrantKycTransaction : TokenRevokeKycTransaction)().setAccountId(accountId).setTokenId(tokenId).freezeWith(client);

	//Sign with the kyc private key of the token
	const signTx = await transaction.signWithSigner(grantSigner);

	//Submit the transaction to a Hedera network
	const txResponse = await signTx.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	//v2.0.5
}

async function updateToken(tokenId, accountId, tokenName, tokenSymbol, treasuryId, treasurySigner, adminPublicKey, adminSigner, client) {
	const signers = [];
	let transaction = new TokenUpdateTransaction().setTokenId(tokenId);
	if (tokenName) transaction = transaction.setTokenName(tokenName);
	if (tokenSymbol) transaction = transaction.setTokenSymbol(tokenSymbol);
	if (treasuryId) {
		transaction = transaction.setTreasuryAccountId(treasuryId);
		if (treasurySigner) signers.push(treasurySigner);
	}
	if (adminPublicKey) {
		transaction = transaction.setAdminKey(adminPublicKey);
		if (adminSigner) signers.push(adminSigner);
	}
	const jitter = Math.floor(Math.random() * 5000) + 30000;
	const now = Date.now() - jitter;
	const seconds = Math.floor(now / 1000) + Cache.timeDrift;
	const nanos = Math.floor(now % 1000) * 1000000 + Math.floor(Math.random() * 1000000);
	const timestamp = new Timestamp(seconds, nanos);

	transaction.setTransactionId(TransactionId.withValidStart(AccountId.fromString(accountId), timestamp));
	transaction = transaction.freezeWith(client);

	for (const signer of signers) {
		transaction = await transaction.signWithSigner(signer);
	}

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);
}

async function mintToken(tokenId, supplySigner, client) {
	//Mint another 1,000 tokens and freeze the unsigned transaction for manual signing
	const transaction = new TokenMintTransaction()
		.setTokenId(tokenId)
		.setAmount(1000)
		.setMaxTransactionFee(new Hbar(20)) //Use when HBAR is under 10 cents
		.freezeWith(client);

	//Sign with the supply private key of the token
	const signTx = await transaction.signWithSigner(supplySigner);

	//Submit the transaction to a Hedera network
	const txResponse = await signTx.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	//v2.0.7
}

async function mintNFT(tokenId, client) {
	const metadataIPFSUrls = [
		Buffer.from('ipfs://bafkreiap62fsqxmo4hy45bmwiqolqqtkhtehghqauixvv5mcq7uofdpvt4'),
		Buffer.from('ipfs://bafkreibvluvlf36lilrqoaum54ga3nlumms34m4kab2x67f5piofmo5fsa'),
		Buffer.from('ipfs://bafkreidrqy67amvygjnvgr2mgdgqg2alaowoy34ljubot6qwf6bcf4yma4'),
		Buffer.from('ipfs://bafkreicoorrcx3d4foreggz72aedxhosuk3cjgumglstokuhw2cmz22n7u'),
		Buffer.from('ipfs://bafkreidv7k5vfn6gnj5mhahnrvhxep4okw75dwbt6o4r3rhe3ktraddf5a')
	];
	const transaction = new TokenMintTransaction().setTokenId(tokenId).setMetadata(metadataIPFSUrls).freezeWith(client);

	// submit txn to hedera network
	const txResponse = await transaction.execute(client);

	const transactionReceipt = await txResponse.getReceipt(client);
	const transactionStatus = transactionReceipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);
}

async function burnToken(tokenId, supplySigner, client) {
	//Burn 1,000 tokens and freeze the unsigned transaction for manual signing
	const transaction = new TokenBurnTransaction().setTokenId(tokenId).setAmount(1000).freezeWith(client);

	//Sign with the supply private key of the token
	const signTx = await transaction.signWithSigner(supplySigner);

	//Submit the transaction to a Hedera network
	const txResponse = await signTx.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	//v2.0.7
}

async function burnNFT(tokenId, serials, client) {
	const transaction = new TokenBurnTransaction().setTokenId(tokenId).setSerials(serials).freezeWith(client);

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	//v2.0.7
}

async function pauseToken(tokenId, pause, pauseSigner, client) {
	//Create the token pause transaction, specify the token to pause, freeze the unsigned transaction for signing
	const transaction = new (pause ? TokenPauseTransaction : TokenUnpauseTransaction)().setTokenId(tokenId).freezeWith(client);

	//Sign with the pause key
	const signTx = await transaction.signWithSigner(pauseSigner);

	//Submit the transaction to a Hedera network
	const txResponse = await signTx.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	//v2.2.0
}

async function wipeToken(accountId, tokenId, amount, wipeSigner, client) {
	//Wipe 100 tokens from an account and freeze the unsigned transaction for manual signing
	const transaction = await new TokenWipeTransaction().setAccountId(accountId).setTokenId(tokenId).setAmount(amount).freezeWith(client);

	//Sign with the payer account private key, sign with the wipe private key of the token
	const signTx = await (await transaction.signWithSigner(wipeSigner)).signWithSigner(wipeSigner);

	//Submit the transaction to a Hedera network
	const txResponse = await signTx.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Obtain the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);
}

async function deleteToken(tokenId, client) {
	//Create the transaction and freeze the unsigned transaction for manual signing
	const transaction = await new TokenDeleteTransaction().setTokenId(tokenId).freezeWith(client);

	if (PRE_SIGN_TX) {
		client.preSignTransaction(transaction);
	}
	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	//v2.0.5
}

async function changeTokenFeeSchedule(tokenId, customFee, feeScheduleSigner, client) {
	//Create the transaction and freeze for manual signing
	const transaction = new TokenFeeScheduleUpdateTransaction()
		.setTokenId(tokenId)
		.setCustomFees(customFee)

		.freezeWith(client);

	//Sign the transaction with the fee schedule key
	const signTx = await transaction.signWithSigner(feeScheduleSigner);

	//Submit the signed transaction to a Hedera network
	const txResponse = await signTx.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status.toString();

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);
	//Version: 2.0.26
}

async function advanceTransferSingleTarget(firstTokenId, firstTokenAmount, secondTokenId, secondTokenAmount, nftTokenId, serials, source, dest, client) {
	const transaction = new TransferTransaction()
		.addTokenTransfer(firstTokenId, source, -firstTokenAmount)
		.addTokenTransfer(firstTokenId, dest, firstTokenAmount)
		.addTokenTransfer(secondTokenId, source, -secondTokenAmount)
		.addTokenTransfer(secondTokenId, dest, secondTokenAmount);

	for (const serial of serials) {
		transaction.addNftTransfer(new NftId(TokenId.fromString(nftTokenId), serial), source, dest);
	}

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Obtain the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} resulted in ${transactionStatus.toString()} response`);

	return txResponse.transactionId.toString();
}

async function advanceTransferTwoTargets(firstTokenId, firstTokenAmount, secondTokenId, secondTokenAmount, nftTokenId, serials, source, dest1, dest2, client) {
	const transaction = new TransferTransaction()
		.addTokenTransfer(firstTokenId, source, -firstTokenAmount)
		.addTokenTransfer(firstTokenId, dest1, firstTokenAmount)
		.addTokenTransfer(secondTokenId, source, -secondTokenAmount)
		.addTokenTransfer(secondTokenId, dest2, secondTokenAmount);

	let m = 0;
	for (const serial of serials) {
		transaction.addNftTransfer(new NftId(TokenId.fromString(nftTokenId), serial), source, m % 2 === 0 ? dest1 : dest2);
		m = m + 1;
	}

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Obtain the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} resulted in ${transactionStatus.toString()} response`);

	return txResponse.transactionId.toString();
}

/**
 * Queries the balances for a given account
 * @param {string} accountId The account Id to query balances for
 * @param {FireblocksHederaClient} client The client to use for executing the query
 * Source - https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/get-account-token-balance
 */
async function getBalancesForAccount(accountId, client) {
	//Create the query
	const query = new AccountBalanceQuery().setAccountId(accountId);

	//Sign with the client operator private key and submit to a Hedera network
	const tokenBalance = await query.execute(client);

	console.log(`The token balance(s) for this account: ${JSON.stringify(tokenBalance.toJSON(), null, 2)}`);

	//v2.0.7
	return tokenBalance;
}

async function cryptoTest(client, tokenId, nftId, serialId, sourceId, destinationId) {
	//Create the transfer transaction
	const transaction = new TransferTransaction()
		.addTokenTransfer(tokenId, sourceId, -1 * tokenAmount)
		.addTokenTransfer(tokenId, destinationId, tokenAmount)
		.addNftTransfer(new NftId(TokenId.fromString(nftId), serialId), sourceId, destinationId);

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Obtain the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} resulted in ${transactionStatus.toString()} response`);

	return txResponse.transactionId.toString();

	//v2.0.5
}

async function associateTokenTest(client, accountId, tokens) {
	const tokenIds = typeof tokens === 'string' ? [tokens] : tokens;

	//Associate a token to an account and freeze the unsigned transaction for signing
	const transaction = new TokenAssociateTransaction().setAccountId(accountId).setTokenIds(tokenIds);

	if (PRE_SIGN_TX) {
		client.preSignTransaction(transaction);
	}

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	return txResponse.transactionId.toString();
}

async function createTokenTest(client, isNFT, tokenConfig, customFees) {
	let transaction = new TokenCreateTransaction()
		.setTokenName(tokenName)
		.setTokenSymbol(tokenSymbol)
		.setInitialSupply(isNFT ? 0 : 5000)
		.setMaxTransactionFee(new Hbar(30)); //Change the default max transaction fee

	const signers = [];
	for (const [type, [pubKey, signer]] of Object.entries(tokenConfig)) {
		if (pubKey === undefined) {
			continue;
		}
		if (type === "admin") { transaction.setAdminKey(pubKey) } else
                if (type === "wipe") { transaction.setWipeKey(pubKey) } else
                    if (type === "freeze") { transaction.setFreezeKey(pubKey) } else
                        if (type === "treasury") { transaction.setTreasuryAccountId(pubKey) } else
                            if (type === "kyc") { transaction.setKycKey(pubKey) } else
                                if (type === "pause") { transaction.setPauseKey(pubKey) } else
                                    if (type === "supply") { transaction.setSupplyKey(pubKey) } else { transaction.setFeeScheduleKey(pubKey); }
		if (signer !== undefined) {
			signers.push(signer);
		}
	}

	if (customFees) {
		transaction = transaction.setCustomFees(customFees);
	}

	if (isNFT) {
		transaction.setTokenType(TokenType.NonFungibleUnique);
	}

	for (const signer of signers) {
		transaction = await transaction.signWithSigner(signer);
	}

	

	//Sign the transaction with the client operator private key and submit to a Hedera network
	const txResponse = await transaction.execute(client);

	//Get the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the token ID from the receipt
	const tokenId = receipt.tokenId;

	console.log(`The new token ID: ${tokenId} in transaction ${txResponse.transactionId.toString()}`);

	return tokenId;
	//v2.0.5
}

async function mintTokenTest(client, isNFT, metadata, tokenId, amount, supplySigner) {
	//Mint another 1,000 tokens and freeze the unsigned transaction for manual signing
	let transaction = new TokenMintTransaction().setTokenId(tokenId).setMaxTransactionFee(new Hbar(20)); //Use when HBAR is under 10 cents

	if (isNFT) {
		transaction = transaction.setMetadata(metadata);
	} else {
		transaction = transaction.setAmount(amount);
	}

	//Sign with the supply private key of the token
	if (supplySigner) transaction = await transaction.signWithSigner(supplySigner);

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	//v2.0.7
}

async function burnTokenTest(client, isNFT, serials, tokenId, amount, supplySigner) {
	//Burn 1,000 tokens and freeze the unsigned transaction for manual signing
	let transaction = new TokenBurnTransaction().setTokenId(tokenId);

	if (isNFT) {
		transaction = transaction.setSerials(
			typeof serials === 'number'
				? [serials]
				: typeof serials === 'string'
				? [parseInt(serials)]
				: typeof serials[0] === 'string'
				? serials.map((v) => parseInt(v))
				: serials
		);
	} else {
		transaction = transaction.setAmount(amount);
	}

	//Sign with the supply private key of the token
	if (supplySigner) transaction = await transaction.signWithSigner(supplySigner);

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	//v2.0.7
}

async function grantOrRevokeKYCForAccountTest(client, trueForGrant, accountId, tokenId, kycSigner) {
	//Enable KYC flag on account and freeze the transaction for manual signing
	let transaction = new (trueForGrant ? TokenGrantKycTransaction : TokenRevokeKycTransaction)()
		.setAccountId(accountId)
		.setTokenId(tokenId)
		.freezeWith(client);

	//Sign with the kyc private key of the token
	if (kycSigner) transaction = await transaction.signWithSigner(kycSigner);

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	//v2.0.5
}

async function disassociateTokenTest(client, accountId, tokenIds) {
	//Dissociate a token from an account and freeze the unsigned transaction for signing
	const transaction = await new TokenDissociateTransaction().setAccountId(accountId).setTokenIds(tokenIds).freezeWith(client);

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log('The transaction consensus status ' + transactionStatus.toString());

	//v2.0.5
}

async function wipeTokenTest(client, accountIdToWipeFrom, tokenIdToWipe, amountToWipe, wipeSigner) {
	//Wipe 100 tokens from an account and freeze the unsigned transaction for manual signing
	let transaction = await new TokenWipeTransaction().setAccountId(accountIdToWipeFrom).setTokenId(tokenIdToWipe).setAmount(amountToWipe).freezeWith(client);

	if (wipeSigner) transaction = await transaction.signWithSigner(wipeSigner);

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Obtain the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);
}

async function pauseOrUnpauseTokenTest(client, trueForPause, tokenId, pauseSigner) {
	//Create the token pause transaction, specify the token to pause, freeze the unsigned transaction for signing
	let transaction = new (trueForPause ? TokenPauseTransaction : TokenUnpauseTransaction)().setTokenId(tokenId).freezeWith(client);

	if (pauseSigner) transaction = await transaction.signWithSigner(pauseSigner);

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	//v2.2.0
}

async function freezeOrUnfreezeAccountForTokenTest(client, trueForFreeze, accountIdToFreeze, tokenId, freezeSigner) {
	//Freeze an account from transferring a token
	let transaction = new (trueForFreeze ? TokenFreezeTransaction : TokenUnfreezeTransaction)()
		.setAccountId(accountIdToFreeze)
		.setTokenId(tokenId)
		.freezeWith(client);

	if (freezeSigner) transaction = await transaction.signWithSigner(freezeSigner);

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	//v2.0.7
}

async function updateTokenTest(client, accountId, tokenId, tokenUpdateConfig) {
	const signers = [];
	let transaction = new TokenUpdateTransaction().setTokenId(tokenId);
	if (tokenUpdateConfig.tokenName) transaction = transaction.setTokenName(tokenUpdateConfig.tokenName);
	if (tokenUpdateConfig.tokenSymbol) transaction = transaction.setTokenSymbol(tokenUpdateConfig.tokenSymbol);
	if (tokenUpdateConfig.treasuryAccountId) {
		transaction = transaction.setTreasuryAccountId(tokenUpdateConfig.treasuryAccountId);
		if (tokenUpdateConfig.treasurySigner) signers.push(tokenUpdateConfig.treasurySigner);
	}
	if (tokenUpdateConfig.adminPublicKey) {
		transaction = transaction.setAdminKey(tokenUpdateConfig.adminPublicKey);
		if (tokenUpdateConfig.adminSigner) signers.push(tokenUpdateConfig.adminSigner);
	}

	// Extends timeout
	const jitter = Math.floor(Math.random() * 5000) + 30000;
	const now = Date.now() - jitter;
	const seconds = Math.floor(now / 1000) + Cache.timeDrift;
	const nanos = Math.floor(now % 1000) * 1000000 + Math.floor(Math.random() * 1000000);
	const timestamp = new Timestamp(seconds, nanos);

	transaction.setTransactionId(TransactionId.withValidStart(AccountId.fromString(accountId), timestamp));
	transaction = transaction.freezeWith(client);

	for (const signer of signers) {
		transaction = await transaction.signWithSigner(signer);
	}

	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);
}

async function updateTokenFeeSchedule(client, tokenId, newCustomFees, feeScheduleSigner) {
	//Create the transaction and freeze for manual signing
	let transaction = new TokenFeeScheduleUpdateTransaction().setTokenId(tokenId).setCustomFees(newCustomFees).freezeWith(client);

	if (feeScheduleSigner) transaction = await transaction.signWithSigner(feeScheduleSigner);

	//Submit the signed transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status.toString();

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);
	//Version: 2.0.26
}

async function deleteTokenTest(client, tokenId) {
	//Create the transaction and freeze the unsigned transaction for manual signing
	const transaction = await new TokenDeleteTransaction().setTokenId(tokenId).freezeWith(client);

	if (PRE_SIGN_TX) {
		client.preSignTransaction(transaction);
	}
	//Submit the transaction to a Hedera network
	const txResponse = await transaction.execute(client);

	//Request the receipt of the transaction
	const receipt = await txResponse.getReceipt(client);

	//Get the transaction consensus status
	const transactionStatus = receipt.status;

	console.log(`Transaction ${txResponse.transactionId.toString()} finished with ${transactionStatus.toString()}`);

	//v2.0.5
}

async function getTokenInfoTest(client, tokenId) {
	//Create the query
	const query = new TokenInfoQuery().setTokenId(tokenId);

	//Sign with the client operator private key, submit the query to the network and get the token supply
	const tokenSupply = await query.execute(client);

	console.log(`The token info: ${JSON.stringify(tokenSupply, null, 2)}`);

	//v2.0.7
}

(async () => {
	const clientConfig1 = {
		apiKey: 'YOUR_API_KEY',
		privateKey: '/path/to/API/secret/key/fireblocks_secret.key',
		vaultAccountId: '<VA_ID>',
		maxNumberOfPayloadsPerTransaction: 1
	};
	const clientConfig2 = {
		apiKey: 'YOUR_API_KEY',
		privateKey: '/path/to/API/secret/key/fireblocks_secret.key',
		vaultAccountId: '<VA_ID>',
		maxNumberOfPayloadsPerTransaction: 1
	};
	const clientConfig3 = {
		apiKey: 'YOUR_API_KEY',
		privateKey: '/path/to/API/secret/key/fireblocks_secret.key',
		vaultAccountId: '<VA_ID>',
		maxNumberOfPayloadsPerTransaction: 1
	};

	const vault1 = 2;
	const vault2 = 5;
	const vault3 = 41;

	const token1Name = 'Dummy2';
	const token1Symbol = 'DUMMY2';

	const client1 = new FireblocksHederaClient();
	const client2 = new FireblocksHederaClient();
	const client3 = new FireblocksHederaClient();
	const signer1 = await client1.getSigner(vault1);
	const signer2 = await client1.getSigner(vault2);
	const signer3 = await client1.getSigner(vault3);
	await client1.init();
	await client3.init();
	await client2.init();

	const preOwnedTokenAccountIdInVault1 = 'XXX';
	const preOwnedNFTAccountIdInVault1 = 'XXX';
	const preOwnedNFTSerialInVault1 = 'XXX';

	const tokenToAssociateToClient1 = 'XXX';
	const tokensToAssociateToClient1 = ['XXX', 'XXX', 'XXX'];

	try {
		const client1AccountId = (await client1.getAccountId()).toString();
		const client2AccountId = (await client2.getAccountId()).toString();
		const client3AccountId = (await client3.getAccountId()).toString();
		const pubKey1 = await client1.getPublicKey();
		const pubKey2 = await client2.getPublicKey();
		const pubKey3 = await client3.getPublicKey();

		await cryptoTransferTest(
			client1,
			preOwnedTokenAccountIdInVault1,
			preOwnedNFTAccountIdInVault1,
			preOwnedNFTSerialInVault1,
			client1AccountId,
			client2AccountId
		);
		await associateTokenTest(client1, client1AccountId, tokenToAssociateToClient1); // single
		await associateTokenTest(client1, client1AccountId, tokensToAssociateToClient1); // multiple

		const tokenConfiguration = {
			admin: [pubKey1, undefined],
			treasury: [client1AccountId, undefined],
			wipe: [pubKey1, undefined],
			kyc: [pubKey1, undefined],
			freeze: [pubKey1, undefined],
			pause: [pubKey1, undefined],
			feeSchedule: [pubKey1, undefined]
		};
		const token1Id = await createTokenTest(client1, false, tokenConfiguration);
		console.log('Please save the following token id in the source file in the corresponding line #:', token1Id.toString());
		const nftToken1Id = await createTokenTest(client1, true, tokenConfiguration);
		console.log('Please save the following NFT token id in the source file in the corresponding line #:', nftToken1Id.toString());

		const metadataIPFSUrls = [
			Buffer.from('ipfs://bafkreiap62fsqxmo4hy45bmwiqolqqtkhtehghqauixvv5mcq7uofdpvt4'),
			Buffer.from('ipfs://bafkreibvluvlf36lilrqoaum54ga3nlumms34m4kab2x67f5piofmo5fsa'),
			Buffer.from('ipfs://bafkreidrqy67amvygjnvgr2mgdgqg2alaowoy34ljubot6qwf6bcf4yma4'),
			Buffer.from('ipfs://bafkreicoorrcx3d4foreggz72aedxhosuk3cjgumglstokuhw2cmz22n7u'),
			Buffer.from('ipfs://bafkreidv7k5vfn6gnj5mhahnrvhxep4okw75dwbt6o4r3rhe3ktraddf5a')
		];
		await mintTokenTest(client1, false, undefined, token1Id, 1000, undefined);
		await mintTokenTest(client1, true, metadataIPFSUrls, nftToken1Id, 0, undefined);

		const nftSerials = [1, 2, 3];
		await burnTokenTest(client1, false, undefined, token1Id, 1000, undefined);
		await burnTokenTest(client1, true, nftSerials, nftToken1Id, 0, undefined);

		await grantOrRevokeKYCForAccountTest(client1, true, client2AccountId, token1Id, undefined);
		await grantOrRevokeKYCForAccountTest(client1, false, client2AccountId, token1Id, undefined);

		await disassociateTokenTest(client1, client1AccountId, [token1Id, nftToken1Id]);
		await wipeTokenTest(client1, client2AccountId, token1Id, 100, undefined);
		await pauseOrUnpauseTokenTest(client1, true, token1Id, undefined);
		await pauseOrUnpauseTokenTest(client1, false, token1Id, undefined);
		await freezeOrUnfreezeAccountForTokenTest(client1, true, client2AccountId, token1Id, undefined);
		await freezeOrUnfreezeAccountForTokenTest(client1, false, client2AccountId, token1Id, undefined);

		const tokenUpdateConfig = {
			tokenName: 'NewName',
			tokenSymbol: 'NEW-SYMBOL',
			adminPublicKey: pubKey2,
			adminSigner: signer2,
			treasuryAccountId: client2AccountId,
			treasurySigner: signer2
		};
		await updateTokenTest(client1, client1AccountId, token1Id, tokenUpdateConfig);

		const customFees = [
			new CustomFixedFee().setAmount(1).setFeeCollectorAccountId(client3AccountId),
			new CustomFixedFee().setAmount(1).setFeeCollectorAccountId(client2AccountId)
		];

		const token2Id = await createTokenTest(client1, false, tokenConfiguration, customFees);
		console.log('Please save the following token id in the source file in the corresponding line #:', token1Id.toString());
		const nftToken2Id = await createTokenTest(client1, true, tokenConfiguration, customFees);
		console.log('Please save the following NFT token id in the source file in the corresponding line #:', nftToken1Id.toString());

		const newCustomFees = [];
		await updateTokenFeeSchedule(client1, token2Id, newCustomFees, undefined);
		await updateTokenFeeSchedule(client1, token2Id, customFees, undefined);

		await deleteTokenTest(client1, token2Id);

		await getTokenInfoTest(client1, token1Id);

		// Associates fungible token or NFT
		await associateToken(client1AccountId, [SAUCER_TOKEN_ID, HASHPACK_NFT_TOKEN_ID], client1);

		const balances = await getBalancesForAccount(client3AccountId, client1);
		const saucerTokenBalance = balances.tokens.get(SAUCER_TOKEN_ID);
		const nftBalance = balances.tokens.get(HASHPACK_NFT_TOKEN_ID);

		await transferTokenAndNFT(SAUCER_TOKEN_ID, HASHPACK_NFT_TOKEN_AND_SERIAL_ID, client1AccountId, client3AccountId, saucerTokenBalance, client1);

		const token1Id = await createToken(
		    token1Name, token1Symbol,
		    client3AccountId, signer3,
		    pubKey1, undefined,
		    pubKey1, undefined,
		    pubKey1, undefined,
		    pubKey1, undefined,
		    pubKey1, undefined,
		    pubKey1, undefined,
		    pubKey1, undefined,
		    [
		        new CustomFixedFee()
		            .setAmount(1) // 1 token is transferred to the fee collecting account each time this token is transferred
		            .setFeeCollectorAccountId(client2AccountId), // 1 token is sent to this account everytime it is transferred
		    ],
		    false, client1
		);

		await associateToken(client3AccountId, [secondCreatedTokenId], client3);
		await associateToken(client1AccountId, [createdNFTId, token1Id], client1);

		await mintToken(token1Id, signer1, client1);
		await burnToken(token1Id, signer1, client1);

		await freezeOrUnfreezeAccountForToken(client1AccountId, token1Id, true, signer1, client1);
		await freezeOrUnfreezeAccountForToken(client1AccountId, token1Id, false, signer1, client1);

		await associateToken(client2AccountId, [createdNFTId, secondCreatedTokenId], client2);
		await grantOrRevokeKYCAccount(client2AccountId, secondCreatedTokenId, true, signer1, client2);
		await grantOrRevokeKYCAccount(client3AccountId, token1Id, true, signer1, client1);
		await grantOrRevokeKYCAccount(client3AccountId, secondCreatedTokenId, true, signer1, client1);
		await grantOrRevokeKYCAccount(client2AccountId, createdNFTId, true, signer1, client1);

		await pauseToken(token1Id, true, signer1, client1);
		await pauseToken(token1Id, false, signer1, client1);

		await associateToken(client2AccountId, [token1Id], client2);
		await transferToken(token1Id, client2AccountId, client3AccountId, 1000, client2);

		await deleteToken(token1Id, client1);

		await wipeToken(client2AccountId, token1Id, 1000, signer1, client1);

		await mintNFT(createdNFTId, client1);
		await burnNFT(createdNFTId, [1, 2, 3, 4, 5], client1);

		await updateToken(token1Id, client1AccountId, undefined, undefined, client2AccountId, signer2, pubKey3, signer3, client1);
		await changeTokenFeeSchedule(
			token1Id,
			[
				new CustomFixedFee()
					.setAmount(1000) // 1 token is transferred to the fee collecting account each time this token is transferred
					.setFeeCollectorAccountId(client2AccountId),
				new CustomFixedFee().setAmount(1000).setFeeCollectorAccountId(client1AccountId).setAllCollectorsAreExempt(true)
			],
			signer1,
			client3
		);

		await getTokenInfo(token1Id, client1);

		await advanceTransferSingleTarget(token1Id, 100, secondCreatedTokenId, 100, createdNFTId, [6, 7], client3AccountId, client1AccountId, client3);
		await advanceTransferTwoTargets(
			token1Id,
			100,
			secondCreatedTokenId,
			100,
			createdNFTId,
			[8, 9, 10],
			client3AccountId,
			client1AccountId,
			client2AccountId,
			client3
		);
	} finally {
		client1.close();
		client3.close();
		client2.close();
	}
})().catch((e) => {
	console.log('Failed to do something: ', e);
	console.error(e);
	console.log(JSON.stringify(e, null, 2));
});
