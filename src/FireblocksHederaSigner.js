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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FireblocksHederaSigner = void 0;
var sdk_1 = require("@hashgraph/sdk");
var FireblocksHederaClient_1 = require("./FireblocksHederaClient");
/**
 * A signer that uses Fireblocks as the signing functionality.
 * This signer implements certain fucntions following {@link Wallet} implementation
 */
var FireblocksHederaSigner = /** @class */ (function () {
    function FireblocksHederaSigner(fireblocksSDK, assetId, vaultAccountId, testnet, client, ledgerId, network, mirrorNetwork) {
        if (testnet === void 0) { testnet = false; }
        this.fireblocksSDK = fireblocksSDK;
        this.assetId = assetId;
        this.vaultAccountId = vaultAccountId;
        this.vaultAccountPublicKey = Buffer.from([]);
        this.cachedTransactionPayloadSignatures = {};
        if ((!client && !(ledgerId || network || mirrorNetwork)) ||
            (client && ledgerId && network && mirrorNetwork)) {
            throw new Error("Must provide (ledgerId, network and mirrorNetwork) or client (either of the values) in FireblocksHederaSigner.");
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
    FireblocksHederaSigner.prototype.preSignTransaction = function (transaction) {
        return __awaiter(this, void 0, void 0, function () {
            var allBodyBytes, messagesToSign, signatures, publicKey, i, sigCounter, signedTransaction, bodyBytesHex;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        allBodyBytes = [];
                        transaction.setTransactionId(sdk_1.TransactionId.generate(this.accountId));
                        if (!transaction.isFrozen()) {
                            transaction.freezeWith(this.client);
                        }
                        //@ts-ignore
                        transaction._transactionIds.setLocked();
                        transaction._nodeAccountIds.setLocked();
                        transaction._signedTransactions.list.forEach(function (signedTx) { var _a; return allBodyBytes.push((_a = signedTx.bodyBytes) !== null && _a !== void 0 ? _a : Buffer.alloc(0)); });
                        messagesToSign = allBodyBytes.filter(function (bodyBytes) { return bodyBytes.length !== 0; });
                        return [4 /*yield*/, (0, FireblocksHederaClient_1.signMultipleMessages)(messagesToSign, this.vaultAccountId, this.fireblocksSDK, this.assetId, this.cachedTransactionPayloadSignatures, "Signing ".concat(transaction.constructor.name, " with ").concat(allBodyBytes.length, " payloads for ").concat(allBodyBytes.length, " nodes"))];
                    case 1:
                        signatures = _a.sent();
                        publicKey = sdk_1.PublicKey.fromBytesED25519(this.vaultAccountPublicKey);
                        for (i = 0, sigCounter = 0; i < transaction._signedTransactions.length; i++) {
                            signedTransaction = transaction._signedTransactions.list[i];
                            if (!signedTransaction.bodyBytes) {
                                continue;
                            }
                            if (signedTransaction.sigMap == null) {
                                signedTransaction.sigMap = {};
                            }
                            if (signedTransaction.sigMap.sigPair == null) {
                                signedTransaction.sigMap.sigPair = [];
                            }
                            bodyBytesHex = signedTransaction.bodyBytes.length > 0
                                ? Buffer.from(signedTransaction.bodyBytes).toString("hex")
                                : "";
                            if (bodyBytesHex !== "") {
                                this.cachedTransactionPayloadSignatures[bodyBytesHex] =
                                    signatures[sigCounter];
                            }
                            sigCounter++;
                        }
                        // We freeze the transaction and remove the operator from the transaction so that when it runs
                        // _beforeExecute it won't try to sign.
                        transaction.freezeWith(this.client);
                        transaction._operator = null;
                        return [2 /*return*/];
                }
            });
        });
    };
    FireblocksHederaSigner.prototype.getPublicKey = function () {
        return __awaiter(this, void 0, void 0, function () {
            var publicKey;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.publicKey) {
                            return [2 /*return*/, this.publicKey];
                        }
                        return [4 /*yield*/, this.fireblocksSDK.vaults.getPublicKeyInfoForAddress({
                                vaultAccountId: "".concat(this.vaultAccountId),
                                assetId: this.assetId,
                                change: 0,
                                addressIndex: 0,
                            })];
                    case 1:
                        publicKey = (_a.sent()).data.publicKey;
                        this.publicKey = sdk_1.PublicKey.fromBytesED25519(Buffer.from(publicKey.replace("0x", ""), "hex"));
                        return [2 /*return*/, this.publicKey];
                }
            });
        });
    };
    FireblocksHederaSigner.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var vaultAddresses, _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (this.vaultAccountPublicKey.length != 0) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.fireblocksSDK.vaults.getVaultAccountAssetAddressesPaginated({
                                vaultAccountId: "".concat(this.vaultAccountId),
                                assetId: this.assetId,
                            })];
                    case 1:
                        vaultAddresses = (_d.sent()).data.addresses;
                        if (vaultAddresses.length === 0) {
                            console.log("Vault account ".concat(this.vaultAccountId, " does not have an ").concat(this.assetId, " wallet in it."));
                            return [2 /*return*/];
                        }
                        this.accountId = vaultAddresses[0].address;
                        _a = this;
                        _c = (_b = Buffer).from;
                        return [4 /*yield*/, this.fireblocksSDK.vaults.getPublicKeyInfoForAddress({
                                vaultAccountId: "".concat(this.vaultAccountId),
                                assetId: this.assetId,
                                change: 0,
                                addressIndex: 0,
                            })];
                    case 2:
                        _a.vaultAccountPublicKey = _c.apply(_b, [(_d.sent()).data.publicKey.replace("0x", ""),
                            "hex"]);
                        return [2 /*return*/];
                }
            });
        });
    };
    FireblocksHederaSigner.prototype.getLedgerId = function () {
        return this.ledgerId;
    };
    FireblocksHederaSigner.prototype.getFireblocksAccountId = function () {
        var _this = this;
        return new Promise(function (r) { return r(sdk_1.AccountId.fromString(_this.accountId)); });
    };
    FireblocksHederaSigner.prototype.getAccountId = function () {
        return sdk_1.AccountId.fromString(this.accountId);
    };
    FireblocksHederaSigner.prototype.getAccountKey = function () {
        return sdk_1.PublicKey.fromBytesED25519(this.vaultAccountPublicKey);
    };
    FireblocksHederaSigner.prototype.getNetwork = function () {
        return this.network;
    };
    FireblocksHederaSigner.prototype.getMirrorNetwork = function () {
        return this.mirrorNetwork;
    };
    FireblocksHederaSigner.prototype.getAccountBalance = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new sdk_1.AccountBalanceQuery()
                            .setAccountId(this.accountId)
                            .execute(this.client)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    FireblocksHederaSigner.prototype.getAccountInfo = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new sdk_1.AccountInfoQuery()
                            .setAccountId(this.accountId)
                            .execute(this.client)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    FireblocksHederaSigner.prototype.getAccountRecords = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new sdk_1.AccountRecordsQuery()
                            .setAccountId(this.accountId)
                            .execute(this.client)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    FireblocksHederaSigner.prototype.sign = function (messages) {
        return __awaiter(this, void 0, void 0, function () {
            var publicKey, accountId, signatures;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        publicKey = sdk_1.PublicKey.fromBytesED25519(this.vaultAccountPublicKey);
                        accountId = sdk_1.AccountId.fromString(this.accountId);
                        return [4 /*yield*/, (0, FireblocksHederaClient_1.signMultipleMessages)(messages, this.vaultAccountId, this.fireblocksSDK, this.assetId, this.cachedTransactionPayloadSignatures)];
                    case 1:
                        signatures = _a.sent();
                        return [2 /*return*/, signatures.map(function (signature) {
                                return new sdk_1.SignerSignature({
                                    publicKey: publicKey,
                                    signature: signature,
                                    accountId: accountId,
                                });
                            })];
                }
            });
        });
    };
    FireblocksHederaSigner.prototype.signTransaction = function (transaction) {
        return __awaiter(this, void 0, void 0, function () {
            var pubKey;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _a.sent();
                        pubKey = sdk_1.PublicKey.fromBytesED25519(this.vaultAccountPublicKey);
                        return [4 /*yield*/, transaction.signWith(pubKey, (function (message) { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0: return [4 /*yield*/, (0, FireblocksHederaClient_1.signMultipleMessages)([message], this.vaultAccountId, this.fireblocksSDK, this.assetId, this.cachedTransactionPayloadSignatures)];
                                        case 1: return [2 /*return*/, (_a.sent())[0]];
                                    }
                                });
                            }); }).bind(this))];
                    case 2: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    FireblocksHederaSigner.prototype.checkTransaction = function (transaction) {
        return __awaiter(this, void 0, void 0, function () {
            var transactionId, accountId;
            return __generator(this, function (_a) {
                transactionId = transaction.transactionId;
                accountId = sdk_1.AccountId.fromString(this.accountId);
                if (transactionId != null &&
                    transactionId.accountId != null &&
                    transactionId.accountId.compare(accountId) != 0) {
                    throw new Error("transaction's ID constructed with a different account ID");
                }
                return [2 /*return*/, Promise.resolve(transaction)];
            });
        });
    };
    FireblocksHederaSigner.prototype.populateTransaction = function (transaction) {
        return __awaiter(this, void 0, void 0, function () {
            var accountId;
            return __generator(this, function (_a) {
                accountId = sdk_1.AccountId.fromString(this.accountId);
                transaction._freezeWithAccountId(accountId);
                if (transaction.transactionId == null) {
                    transaction.setTransactionId(sdk_1.TransactionId.generate(this.accountId));
                }
                if (transaction.nodeAccountIds != null &&
                    transaction.nodeAccountIds.length != 0) {
                    return [2 /*return*/, Promise.resolve(transaction.freeze())];
                }
                return [2 /*return*/, Promise.resolve(transaction)];
            });
        });
    };
    FireblocksHederaSigner.prototype.call = function (request) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error("The Fireblocks signer does not support any call operation.");
            });
        });
    };
    return FireblocksHederaSigner;
}());
exports.FireblocksHederaSigner = FireblocksHederaSigner;
