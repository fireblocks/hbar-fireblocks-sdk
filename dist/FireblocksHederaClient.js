"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FireblocksHederaClient = void 0;
exports.signMultipleMessages = signMultipleMessages;
const sdk_1 = require("@hashgraph/sdk");
const ts_sdk_1 = require("@fireblocks/ts-sdk");
const fs_1 = require("fs");
const util_1 = require("util");
const FireblocksHederaSigner_1 = require("./FireblocksHederaSigner");
const proto_1 = require("@hashgraph/proto");
class FireblocksHederaClient extends sdk_1.Client {
    constructor(config) {
        super({ network: config.testnet ? 'testnet' : 'mainnet' });
        this.config = config;
        this.vaultAccountPublicKey = Buffer.from([]);
        this.transactionPayloadSignatures = {};
        if (config.vaultAccountId < 0) {
            throw new Error('Please provide a non-negative integer for the vault account.');
        }
        if (!(0, fs_1.existsSync)(config.privateKey)) {
            throw new Error('Private key path does not exist.');
        }
        if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/g.test(config.apiKey)) {
            throw new Error('API Key provided is not valid.');
        }
        if (config.maxNumberOfPayloadsPerTransaction && config.maxNumberOfPayloadsPerTransaction <= 0) {
            throw new Error('Invalid maximal number of payloads per transaction.');
        }
        this.fireblocksSDK = new ts_sdk_1.Fireblocks({
            apiKey: config.apiKey,
            basePath: config.apiEndpoint,
            secretKey: (0, fs_1.readFileSync)(config.privateKey, 'utf8')
        });
        this.assetId = config.testnet ? 'HBAR_TEST' : 'HBAR';
        if (config.maxNumberOfPayloadsPerTransaction)
            this._network.setMaxNodesPerTransaction(config.maxNumberOfPayloadsPerTransaction);
    }
    /**
     * Creates a Signer object that can be used in conjunction with this client for multi-signature transactions.
     * @param vaultAccountId The vault account ID you'd like to sign with
     * @returns A {@link Signer} object that will sign using the provided vaultAccountId.
     */
    getSigner(vaultAccountId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const signer = new FireblocksHederaSigner_1.FireblocksHederaSigner(this.fireblocksSDK, this.assetId, vaultAccountId, (_a = this.config.testnet) !== null && _a !== void 0 ? _a : false, this);
            yield signer.init();
            return signer;
        });
    }
    populateVaultAccountData() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.vaultAccountPublicKey.length != 0) {
                return;
            }
            const vaultAddresses = (yield this.fireblocksSDK.vaults.getVaultAccountAssetAddressesPaginated({
                vaultAccountId: `${this.config.vaultAccountId}`,
                assetId: this.assetId
            })).data.addresses;
            if (vaultAddresses.length === 0) {
                console.log(`Vault account ${this.config.vaultAccountId} does not have an ${this.assetId} wallet in it.`);
                return;
            }
            this.accountId = vaultAddresses[0].address;
            this.vaultAccountPublicKey = Buffer.from((yield this.fireblocksSDK.vaults.getPublicKeyInfoForAddress({
                vaultAccountId: `${this.config.vaultAccountId}`,
                assetId: this.assetId,
                change: 0,
                addressIndex: 0
            })).data.publicKey.replace('0x', ''), 'hex');
            yield this.setupUndelyingClient();
        });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.populateVaultAccountData();
        });
    }
    setupUndelyingClient() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.vaultAccountPublicKey.length == 0)
                yield this.populateVaultAccountData();
            this.setOperatorWith(this.accountId, sdk_1.PublicKey.fromBytesED25519(this.vaultAccountPublicKey), this.signTx.bind(this));
        });
    }
    getFireblocksAccountId() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.init();
            return sdk_1.AccountId.fromString(this.accountId);
        });
    }
    getPublicKey() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.init();
            return sdk_1.PublicKey.fromBytesED25519(this.vaultAccountPublicKey);
        });
    }
    signTx(message) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield signMultipleMessages([message], this.config.vaultAccountId, this.fireblocksSDK, this.assetId, this.transactionPayloadSignatures))[0];
        });
    }
    preSignTransaction(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            const allBodyBytes = [];
            const jitter = Math.floor(Math.random() * 5000) + 30000;
            const now = Date.now() - jitter;
            const seconds = Math.floor(now / 1000) + sdk_1.Cache.timeDrift;
            const nanos = Math.floor(now % 1000) * 1000000 + Math.floor(Math.random() * 1000000);
            const timestamp = new sdk_1.Timestamp(seconds, nanos);
            transaction.setTransactionId(sdk_1.TransactionId.withValidStart(sdk_1.AccountId.fromString(this.accountId), timestamp));
            if (!transaction.isFrozen()) {
                transaction.freezeWith(this);
            }
            //@ts-ignore
            transaction._transactionIds.setLocked();
            transaction._nodeAccountIds.setLocked();
            transaction._signedTransactions.list.forEach((signedTx) => { var _a; return allBodyBytes.push((_a = signedTx.bodyBytes) !== null && _a !== void 0 ? _a : Buffer.alloc(0)); });
            const messagesToSign = allBodyBytes.filter((bodyBytes) => bodyBytes.length !== 0);
            const signatures = yield signMultipleMessages(messagesToSign, this.config.vaultAccountId, this.fireblocksSDK, this.assetId, this.transactionPayloadSignatures, `Signing ${transaction.constructor.name} with ${allBodyBytes.length} payloads for ${allBodyBytes.length} nodes`);
            const publicKey = sdk_1.PublicKey.fromBytesED25519(this.vaultAccountPublicKey);
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
        });
    }
}
exports.FireblocksHederaClient = FireblocksHederaClient;
function signMultipleMessages(messages, vaultAccountId, fireblocksSDK, assetId, transactionPayloadSignatures, customNote) {
    return __awaiter(this, void 0, void 0, function* () {
        const signatures = [];
        if (messages.length === 0) {
            return signatures;
        }
        const messagesData = messages.map((message, index) => ({
            typeToSign: `${index + 1}: ${proto_1.proto.TransactionBody.decode(message).data}`,
            message
        }));
        messages.forEach((message) => {
            var _a;
            const messageHex = Buffer.from(message).toString('hex');
            const sigBuffer = (_a = transactionPayloadSignatures[messageHex]) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
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
        const { id: txId } = (yield fireblocksSDK.transactions.createTransaction({
            transactionRequest: {
                assetId: assetId,
                operation: ts_sdk_1.TransactionOperation.Raw,
                note: customNote !== null && customNote !== void 0 ? customNote : `Signing: ${transactionTypesToSign}`,
                source: {
                    id: `${vaultAccountId}`,
                    type: ts_sdk_1.TransferPeerPathType.VaultAccount
                },
                extraParameters: {
                    rawMessageData: {
                        messages: messagesForRawSigning
                    }
                }
            }
        })).data;
        let tx = yield fireblocksSDK.transactions.getTransaction({ txId });
        while (!['BLOCKED', 'REJECTED', 'COMPLETED', 'CANCELLED', 'FAILED'].includes(tx.data.status)) {
            yield new Promise((r) => setTimeout(r, 5000));
            tx = yield fireblocksSDK.transactions.getTransaction({ txId });
        }
        if (['BLOCKED', 'REJECTED', 'CANCELLED', 'FAILED'].includes(tx.data.status)) {
            throw `Transaction signature failed - ${(0, util_1.inspect)(tx, false, null, true)}`;
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
    });
}
//# sourceMappingURL=FireblocksHederaClient.js.map