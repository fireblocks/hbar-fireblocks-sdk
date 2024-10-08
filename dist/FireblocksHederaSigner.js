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
exports.FireblocksHederaSigner = void 0;
const sdk_1 = require("@hashgraph/sdk");
const FireblocksHederaClient_1 = require("./FireblocksHederaClient");
/**
 * A signer that uses Fireblocks as the signing functionality.
 * This signer implements certain fucntions following {@link Wallet} implementation
 */
class FireblocksHederaSigner {
    constructor(fireblocksSDK, assetId, vaultAccountId, testnet = false, client, ledgerId, network, mirrorNetwork) {
        this.fireblocksSDK = fireblocksSDK;
        this.assetId = assetId;
        this.vaultAccountId = vaultAccountId;
        this.vaultAccountPublicKey = Buffer.from([]);
        this.cachedTransactionPayloadSignatures = {};
        if ((!client && !(ledgerId || network || mirrorNetwork)) || (client && ledgerId && network && mirrorNetwork)) {
            throw new Error('Must provide (ledgerId, network and mirrorNetwork) or client (either of the values) in FireblocksHederaSigner.');
        }
        if (ledgerId && network && mirrorNetwork) {
            this.ledgerId = ledgerId;
            this.network = network;
            this.mirrorNetwork = mirrorNetwork;
            this.client = (testnet ? sdk_1.Client.forTestnet : sdk_1.Client.forMainnet)();
        }
        if (client) {
            this.ledgerId = client.ledgerId;
            this.network = client.network;
            this.mirrorNetwork = client.mirrorNetwork;
            this.client = client;
        }
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
            // transaction.setStart(600); // 10 minute validity
            // transaction.transactionId
            if (!transaction.isFrozen()) {
                transaction.freezeWith(this.client);
            }
            //@ts-ignore
            transaction._transactionIds.setLocked();
            transaction._nodeAccountIds.setLocked();
            transaction._signedTransactions.list.forEach((signedTx) => { var _a; return allBodyBytes.push((_a = signedTx.bodyBytes) !== null && _a !== void 0 ? _a : Buffer.alloc(0)); });
            const messagesToSign = allBodyBytes.filter((bodyBytes) => bodyBytes.length !== 0);
            const signatures = yield (0, FireblocksHederaClient_1.signMultipleMessages)(messagesToSign, this.vaultAccountId, this.fireblocksSDK, this.assetId, this.cachedTransactionPayloadSignatures, `Signing ${transaction.constructor.name} with ${allBodyBytes.length} payloads for ${allBodyBytes.length} nodes`);
            const publicKey = sdk_1.PublicKey.fromBytesED25519(this.vaultAccountPublicKey);
            for (let i = 0, sigCounter = 0; i < transaction._signedTransactions.length; i++) {
                const signedTransaction = transaction._signedTransactions.list[i];
                if (!signedTransaction.bodyBytes) {
                    continue;
                }
                if (signedTransaction.sigMap == null) {
                    signedTransaction.sigMap = {};
                }
                if (signedTransaction.sigMap.sigPair == null) {
                    signedTransaction.sigMap.sigPair = [];
                }
                // signedTransaction.sigMap.sigPair.push(publicKey._toProtobufSignature(signatures[sigCounter]));
                // Cache the signatures so that when the transaction is actually executed we will simply pop them from the cache instead
                const bodyBytesHex = signedTransaction.bodyBytes.length > 0 ? Buffer.from(signedTransaction.bodyBytes).toString('hex') : '';
                if (bodyBytesHex !== '') {
                    this.cachedTransactionPayloadSignatures[bodyBytesHex] = signatures[sigCounter];
                }
                sigCounter++;
            }
            // We freeze the transaction and remove the operator from the transaction so that when it runs
            // _beforeExecute it won't try to sign.
            transaction.freezeWith(this.client);
            transaction._operator = null;
        });
    }
    getPublicKey() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.publicKey) {
                return this.publicKey;
            }
            const { publicKey } = (yield this.fireblocksSDK.vaults.getPublicKeyInfoForAddress({
                vaultAccountId: `${this.vaultAccountId}`,
                assetId: this.assetId,
                change: 0,
                addressIndex: 0
            })).data;
            this.publicKey = sdk_1.PublicKey.fromBytesED25519(Buffer.from(publicKey.replace('0x', ''), 'hex'));
            return this.publicKey;
        });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.vaultAccountPublicKey.length != 0) {
                return;
            }
            const vaultAddresses = (yield this.fireblocksSDK.vaults.getVaultAccountAssetAddressesPaginated({
                vaultAccountId: `${this.vaultAccountId}`,
                assetId: this.assetId
            })).data.addresses;
            if (vaultAddresses.length === 0) {
                console.log(`Vault account ${this.vaultAccountId} does not have an ${this.assetId} wallet in it.`);
                return;
            }
            this.accountId = vaultAddresses[0].address;
            this.vaultAccountPublicKey = Buffer.from((yield this.fireblocksSDK.vaults.getPublicKeyInfoForAddress({
                vaultAccountId: `${this.vaultAccountId}`,
                assetId: this.assetId,
                change: 0,
                addressIndex: 0
            })).data.publicKey.replace('0x', ''), 'hex');
        });
    }
    getLedgerId() {
        return this.ledgerId;
    }
    getFireblocksAccountId() {
        return new Promise((r) => r(sdk_1.AccountId.fromString(this.accountId)));
    }
    getAccountId() {
        return sdk_1.AccountId.fromString(this.accountId);
    }
    getAccountKey() {
        return sdk_1.PublicKey.fromBytesED25519(this.vaultAccountPublicKey);
    }
    getNetwork() {
        return this.network;
    }
    getMirrorNetwork() {
        return this.mirrorNetwork;
    }
    getAccountBalance() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield new sdk_1.AccountBalanceQuery().setAccountId(this.accountId).execute(this.client);
        });
    }
    getAccountInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield new sdk_1.AccountInfoQuery().setAccountId(this.accountId).execute(this.client);
        });
    }
    getAccountRecords() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield new sdk_1.AccountRecordsQuery().setAccountId(this.accountId).execute(this.client);
        });
    }
    sign(messages) {
        return __awaiter(this, void 0, void 0, function* () {
            const publicKey = sdk_1.PublicKey.fromBytesED25519(this.vaultAccountPublicKey);
            const accountId = sdk_1.AccountId.fromString(this.accountId);
            const signatures = yield (0, FireblocksHederaClient_1.signMultipleMessages)(messages, this.vaultAccountId, this.fireblocksSDK, this.assetId, this.cachedTransactionPayloadSignatures);
            return signatures.map((signature) => new sdk_1.SignerSignature({
                publicKey,
                signature,
                accountId
            }));
        });
    }
    signTransaction(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.init();
            const pubKey = sdk_1.PublicKey.fromBytesED25519(this.vaultAccountPublicKey);
            return yield transaction.signWith(pubKey, ((message) => __awaiter(this, void 0, void 0, function* () {
                return (yield (0, FireblocksHederaClient_1.signMultipleMessages)([message], this.vaultAccountId, this.fireblocksSDK, this.assetId, this.cachedTransactionPayloadSignatures))[0];
            })).bind(this));
        });
    }
    checkTransaction(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Removed part that is related to provider which is not relevant here, might need to re-add it at a later point in time.
            const transactionId = transaction.transactionId;
            const accountId = sdk_1.AccountId.fromString(this.accountId);
            if (transactionId != null && transactionId.accountId != null && transactionId.accountId.compare(accountId) != 0) {
                throw new Error("transaction's ID constructed with a different account ID");
            }
            return Promise.resolve(transaction);
        });
    }
    populateTransaction(transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Removed part that is related to provide which is not relevant here, might need to re-add it at a later point in time.
            const accountId = sdk_1.AccountId.fromString(this.accountId);
            transaction._freezeWithAccountId(accountId);
            if (transaction.transactionId == null) {
                transaction.setTransactionId(sdk_1.TransactionId.generate(this.accountId));
            }
            if (transaction.nodeAccountIds != null && transaction.nodeAccountIds.length != 0) {
                return Promise.resolve(transaction.freeze());
            }
            return Promise.resolve(transaction);
        });
    }
    call(request) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('The Fireblocks signer does not support any call operation.');
        });
    }
}
exports.FireblocksHederaSigner = FireblocksHederaSigner;
//# sourceMappingURL=FireblocksHederaSigner.js.map