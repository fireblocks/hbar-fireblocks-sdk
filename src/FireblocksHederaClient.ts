import { AccountId, Cache, Client, PublicKey, Timestamp, Transaction, TransactionId } from '@hashgraph/sdk';
import { Fireblocks, TransactionStateEnum, TransferPeerPathType, TransactionOperation } from '@fireblocks/ts-sdk';
import { existsSync, readFileSync } from 'fs';
import { inspect } from 'util';
import { FireblocksHederaSignerAdditionalFunctionality, FireblocksHederaClientConfig } from './type';
import { Signer } from '@hashgraph/sdk/lib/Signer';
import { FireblocksHederaSigner } from './FireblocksHederaSigner';
import { proto } from '@hashgraph/proto';

export class FireblocksHederaClient extends Client implements FireblocksHederaSignerAdditionalFunctionality {
	private fireblocksSDK: Fireblocks;
	private accountId: string;
	private assetId: string;
	private vaultAccountPublicKey: Buffer = Buffer.from([]);

	private transactionPayloadSignatures: { [bodyBytes: string]: Uint8Array } = {};

	constructor(private config: FireblocksHederaClientConfig) {
		super({ network: config.testnet ? 'testnet' : 'mainnet' });
		if (config.vaultAccountId < 0) {
			throw new Error('Please provide a non-negative integer for the vault account.');
		}
		if (!existsSync(config.privateKey)) {
			throw new Error('Private key path does not exist.');
		}
		if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/g.test(config.apiKey)) {
			throw new Error('API Key provided is not valid.');
		}
		if (config.maxNumberOfPayloadsPerTransaction && config.maxNumberOfPayloadsPerTransaction <= 0) {
			throw new Error('Invalid maximal number of payloads per transaction.');
		}
		this.fireblocksSDK = new Fireblocks({
			apiKey: config.apiKey,
			basePath: config.apiEndpoint,
			secretKey: readFileSync(config.privateKey, 'utf8')
		});
		this.assetId = config.testnet ? 'HBAR_TEST' : 'HBAR';
		if (config.maxNumberOfPayloadsPerTransaction) this._network.setMaxNodesPerTransaction(config.maxNumberOfPayloadsPerTransaction);
	}

	/**
	 * Creates a Signer object that can be used in conjunction with this client for multi-signature transactions.
	 * @param vaultAccountId The vault account ID you'd like to sign with
	 * @returns A {@link Signer} object that will sign using the provided vaultAccountId.
	 */
	public async getSigner(vaultAccountId: number): Promise<Signer> {
		const signer: FireblocksHederaSigner = new FireblocksHederaSigner(this.fireblocksSDK, this.assetId, vaultAccountId, this.config.testnet ?? false, this);
		await signer.init();
		return signer;
	}

	private async populateVaultAccountData() {
		if (this.vaultAccountPublicKey.length != 0) {
			return;
		}

		const vaultAddresses = (
			await this.fireblocksSDK.vaults.getVaultAccountAssetAddressesPaginated({
				vaultAccountId: `${this.config.vaultAccountId}`,
				assetId: this.assetId
			})
		).data.addresses;
		if (vaultAddresses.length === 0) {
			console.log(`Vault account ${this.config.vaultAccountId} does not have an ${this.assetId} wallet in it.`);
			return;
		}
		this.accountId = vaultAddresses[0].address;

		this.vaultAccountPublicKey = Buffer.from(
			(
				await this.fireblocksSDK.vaults.getPublicKeyInfoForAddress({
					vaultAccountId: `${this.config.vaultAccountId}`,
					assetId: this.assetId,
					change: 0,
					addressIndex: 0
				})
			).data.publicKey.replace('0x', ''),
			'hex'
		);

		await this.setupUndelyingClient();
	}

	public async init() {
		await this.populateVaultAccountData();
	}

	private async setupUndelyingClient() {
		if (this.vaultAccountPublicKey.length == 0) await this.populateVaultAccountData();
		this.setOperatorWith(this.accountId, PublicKey.fromBytesED25519(this.vaultAccountPublicKey), this.signTx.bind(this));
	}

	public async getFireblocksAccountId(): Promise<AccountId> {
		await this.init();
		return AccountId.fromString(this.accountId);
	}

	public async getPublicKey(): Promise<PublicKey> {
		await this.init();
		return PublicKey.fromBytesED25519(this.vaultAccountPublicKey);
	}

	private async signTx(message: Uint8Array): Promise<Uint8Array> {
		return (await signMultipleMessages([message], this.config.vaultAccountId, this.fireblocksSDK, this.assetId, this.transactionPayloadSignatures))[0];
	}

	public async preSignTransaction<T extends Transaction>(transaction: T): Promise<void> {
		const allBodyBytes: Uint8Array[] = [];

		if (!transaction.transactionId) {
			transaction.setTransactionId(TransactionId.generate(this.accountId));
			transaction.freezeWith(this);
			//@ts-ignore
			transaction._transactionIds.setLocked();
			transaction._nodeAccountIds.setLocked();
		}
		transaction._signedTransactions.list.forEach((signedTx) => allBodyBytes.push(signedTx.bodyBytes ?? Buffer.alloc(0)));
		const messagesToSign = allBodyBytes.filter((bodyBytes) => bodyBytes.length !== 0);

		const signatures = await signMultipleMessages(
			messagesToSign,
			this.config.vaultAccountId,
			this.fireblocksSDK,
			this.assetId,
			this.transactionPayloadSignatures,
			`Signing ${transaction.constructor.name} with ${allBodyBytes.length} payloads for ${allBodyBytes.length} nodes`
		);
		const publicKey = PublicKey.fromBytesED25519(this.vaultAccountPublicKey);
		for (let i = 0, sigCounter = 0; i < transaction._signedTransactions.length; i++) {
			const signedTransaction = transaction._signedTransactions.list[i];
			if (!signedTransaction.bodyBytes) {
				continue;
			}
			// Cache the signatures so that when the transaction is actually executed we will simply pop them from the cache instead
			const bodyBytesHex = signedTransaction.bodyBytes.length > 0 ? Buffer.from(signedTransaction.bodyBytes).toString('hex') : '';
			if (bodyBytesHex !== '') {
				this.transactionPayloadSignatures[bodyBytesHex] = signatures[sigCounter];
			}

			sigCounter++;
		}
	}
}

export async function signMultipleMessages(
	messages: Uint8Array[],
	vaultAccountId: number,
	fireblocksSDK: Fireblocks,
	assetId: string,
	transactionPayloadSignatures: { [key: string]: Uint8Array },
	customNote?: string
): Promise<Uint8Array[]> {
	const signatures: Uint8Array[] = [];

	if (messages.length === 0) {
		return signatures;
	}

	const messagesData = messages.map((message, index) => ({
		typeToSign: `${index + 1}: ${proto.TransactionBody.decode(message).data}`,
		message
	}));
	messages.forEach((message) => {
		const messageHex = Buffer.from(message).toString('hex');
		const sigBuffer = transactionPayloadSignatures[messageHex] ?? Buffer.alloc(0);
		signatures.push(sigBuffer);
		if (sigBuffer.length > 0) {
			delete transactionPayloadSignatures[messageHex];
		}
	});
	// This checks that the number of signatures that are not of length 0 matches the number of messages.
	// If it is it means that all messages were previously signed and cached.
	if (signatures.filter((sig) => sig.length !== 0).length === messages.length) {
		return signatures;
	}

	let transactionTypesToSign = '';
	const messagesForRawSigning = [];
	//TODO: Check for > 250
	for (const messageData of messagesData) {
		if (!messageData) {
			transactionTypesToSign = transactionTypesToSign === '' ? 'Using cached' : transactionTypesToSign + '\n' + 'using cached';
			messagesForRawSigning.push({ content: '0'.repeat(32) });
			continue;
		}
		transactionTypesToSign = transactionTypesToSign === '' ? messageData.typeToSign : transactionTypesToSign + '\n' + messageData.typeToSign;
		messagesForRawSigning.push({ content: Buffer.from(messageData.message).toString('hex') });
	}

	const { id: txId } = (
		await fireblocksSDK.transactions.createTransaction({
			transactionRequest: {
				assetId: assetId,
				operation: TransactionOperation.Raw,
				note: customNote ?? `Signing: ${transactionTypesToSign}`,
				source: {
					id: `${vaultAccountId}`,
					type: TransferPeerPathType.VaultAccount
				},
				extraParameters: {
					rawMessageData: {
						messages: messagesForRawSigning
					}
				}
			}
		})
	).data;

	let tx = await fireblocksSDK.transactions.getTransaction({ txId });

	while (!['BLOCKED', 'REJECTED', 'COMPLETED', 'CANCELLED', 'FAILED'].includes(tx.data.status)) {
		await new Promise((r) => setTimeout(r, 5000));
		tx = await fireblocksSDK.transactions.getTransaction({ txId });
	}
	if (['BLOCKED', 'REJECTED', 'CANCELLED', 'FAILED'].includes(tx.data.status)) {
		throw `Transaction signature failed - ${inspect(tx, false, null, true)}`;
	}

	// Re order the returned values in the expected order
	const signedMessages = tx.data.signedMessages;
	if (!signedMessages) {
		throw new Error('No signed messages found after transaction finished.');
	}

	signedMessages.forEach((signedMessage) => {
		const sigBuffer = Buffer.from(signedMessage.signature.fullSig.replace('0x', ''), 'hex');
		const sigIndex = messages.map((msg) => Buffer.from(msg).equals(Buffer.from(signedMessage.content.replace('0x', ''), 'hex'))).indexOf(true);
		if (sigIndex === -1) {
			throw new Error("Got signature for message which didn't request to sign");
		}
		signatures[sigIndex] = sigBuffer;
	});

	return signatures;
}
