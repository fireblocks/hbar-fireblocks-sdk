"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.FireblocksHederaClient = void 0;
exports.signMultipleMessages = signMultipleMessages;
var sdk_1 = require("@hashgraph/sdk");
var ts_sdk_1 = require("@fireblocks/ts-sdk");
var fs_1 = require("fs");
var util_1 = require("util");
var FireblocksHederaSigner_1 = require("./FireblocksHederaSigner");
var proto_1 = require("@hashgraph/proto");
var transaction_signWith_1 = require("./patches/transaction.signWith");
var query__beforeExecute_1 = require("./patches/query._beforeExecute");
var FireblocksHederaClient = /** @class */ (function (_super) {
    __extends(FireblocksHederaClient, _super);
    function FireblocksHederaClient(config) {
        var _this = _super.call(this, { network: config.testnet ? "testnet" : "mainnet" }) || this;
        _this.config = config;
        _this.vaultAccountPublicKey = Buffer.from([]);
        _this.transactionPayloadSignatures = {};
        if (config.vaultAccountId < 0) {
            throw new Error("Please provide a non-negative integer for the vault account.");
        }
        if (!(0, fs_1.existsSync)(config.privateKey)) {
            throw new Error("Private key path does not exist.");
        }
        if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/g.test(config.apiKey)) {
            throw new Error("API Key provided is not valid.");
        }
        if (config.maxNumberOfPayloadsPerTransaction &&
            config.maxNumberOfPayloadsPerTransaction <= 0) {
            throw new Error("Invalid maximal number of payloads per transaction.");
        }
        _this.fireblocksSDK = new ts_sdk_1.Fireblocks({
            apiKey: config.apiKey,
            basePath: config.apiEndpoint,
            secretKey: (0, fs_1.readFileSync)(config.privateKey, "utf8"),
        });
        _this.assetId = config.testnet ? "HBAR_TEST" : "HBAR";
        if (config.maxNumberOfPayloadsPerTransaction)
            _this._network.setMaxNodesPerTransaction(config.maxNumberOfPayloadsPerTransaction);
        _this.signers = ["".concat(config.vaultAccountId)];
        return _this;
    }
    /**
     * Creates a Signer object that can be used in conjunction with this client for multi-signature transactions.
     * @param vaultAccountId The vault account ID you'd like to sign with
     * @returns A {@link Signer} object that will sign using the provided vaultAccountId.
     */
    FireblocksHederaClient.prototype.getSigner = function (vaultAccountId) {
        return __awaiter(this, void 0, void 0, function () {
            var signer;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        signer = new FireblocksHederaSigner_1.FireblocksHederaSigner(this.fireblocksSDK, this.assetId, vaultAccountId, (_a = this.config.testnet) !== null && _a !== void 0 ? _a : false, this);
                        return [4 /*yield*/, signer.init()];
                    case 1:
                        _b.sent();
                        return [2 /*return*/, signer];
                }
            });
        });
    };
    FireblocksHederaClient.prototype.populateVaultAccountData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var vaultAddresses, _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (this.vaultAccountPublicKey.length != 0) {
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, this.fireblocksSDK.vaults.getVaultAccountAssetAddressesPaginated({
                                vaultAccountId: "".concat(this.config.vaultAccountId),
                                assetId: this.assetId,
                            })];
                    case 1:
                        vaultAddresses = (_d.sent()).data.addresses;
                        if (vaultAddresses.length === 0) {
                            console.log("Vault account ".concat(this.config.vaultAccountId, " does not have an ").concat(this.assetId, " wallet in it."));
                            return [2 /*return*/];
                        }
                        this.accountId = vaultAddresses[0].address;
                        _a = this;
                        _c = (_b = Buffer).from;
                        return [4 /*yield*/, this.fireblocksSDK.vaults.getPublicKeyInfoForAddress({
                                vaultAccountId: "".concat(this.config.vaultAccountId),
                                assetId: this.assetId,
                                change: 0,
                                addressIndex: 0,
                            })];
                    case 2:
                        _a.vaultAccountPublicKey = _c.apply(_b, [(_d.sent()).data.publicKey.replace("0x", ""),
                            "hex"]);
                        return [4 /*yield*/, this.setupUndelyingClient()];
                    case 3:
                        _d.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    FireblocksHederaClient.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.populateVaultAccountData()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    FireblocksHederaClient.prototype.setupUndelyingClient = function () {
        return __awaiter(this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        if (!(this.vaultAccountPublicKey.length == 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.populateVaultAccountData()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        this.setOperatorWith(this.accountId, sdk_1.PublicKey.fromBytesED25519(this.vaultAccountPublicKey), this.multiSignTx.bind(this));
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        throw new Error(e_1);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    FireblocksHederaClient.prototype.multiSignTx = function (messages) {
        return __awaiter(this, void 0, void 0, function () {
            var signatures, messagesData, transactionTypesToSign, messagesForRawSigning, _i, messagesData_1, messageData, _loop_1, this_1, _a, _b, signer;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        signatures = {};
                        if (messages.length === 0) {
                            return [2 /*return*/, signatures];
                        }
                        if (!(messages instanceof Buffer)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.signTx(messages)];
                    case 1: 
                    //@ts-ignore
                    return [2 /*return*/, _c.sent()];
                    case 2:
                        messagesData = messages.map(function (message, index) { return ({
                            typeToSign: "".concat(index + 1, ": ").concat(proto_1.proto.TransactionBody.decode(message).data),
                            message: message,
                        }); });
                        transactionTypesToSign = "";
                        messagesForRawSigning = [];
                        for (_i = 0, messagesData_1 = messagesData; _i < messagesData_1.length; _i++) {
                            messageData = messagesData_1[_i];
                            transactionTypesToSign =
                                transactionTypesToSign === ""
                                    ? messageData.typeToSign
                                    : transactionTypesToSign + "\n" + messageData.typeToSign;
                            messagesForRawSigning.push({
                                content: Buffer.from(messageData.message).toString("hex"),
                            });
                        }
                        _loop_1 = function (signer) {
                            var txId, tx, signedMessages, pubKey;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0: return [4 /*yield*/, this_1.fireblocksSDK.transactions.createTransaction({
                                            transactionRequest: {
                                                assetId: this_1.assetId,
                                                operation: ts_sdk_1.TransactionOperation.Raw,
                                                note: "Signing: ".concat(transactionTypesToSign),
                                                source: {
                                                    id: signer,
                                                    type: ts_sdk_1.TransferPeerPathType.VaultAccount,
                                                },
                                                extraParameters: {
                                                    rawMessageData: {
                                                        messages: messagesForRawSigning,
                                                    },
                                                },
                                            },
                                        })];
                                    case 1:
                                        txId = (_d.sent()).data.id;
                                        return [4 /*yield*/, this_1.fireblocksSDK.transactions.getTransaction({ txId: txId })];
                                    case 2:
                                        tx = _d.sent();
                                        _d.label = 3;
                                    case 3:
                                        if (!!["BLOCKED", "REJECTED", "COMPLETED", "CANCELLED", "FAILED"].includes(tx.data.status)) return [3 /*break*/, 6];
                                        console.log("Polling for Tx Id: ".concat(txId, ", status: ").concat(tx.data.status));
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1000); })];
                                    case 4:
                                        _d.sent();
                                        return [4 /*yield*/, this_1.fireblocksSDK.transactions.getTransaction({ txId: txId })];
                                    case 5:
                                        tx = _d.sent();
                                        return [3 /*break*/, 3];
                                    case 6:
                                        if (["BLOCKED", "REJECTED", "CANCELLED", "FAILED"].includes(tx.data.status)) {
                                            throw "Transaction signature failed - ".concat((0, util_1.inspect)(tx, false, null, true));
                                        }
                                        console.log("txId: ".concat(txId, " finished"));
                                        signedMessages = tx.data.signedMessages;
                                        if (!signedMessages) {
                                            throw new Error("No signed messages found after transaction finished.");
                                        }
                                        return [4 /*yield*/, this_1.getPublicKeyByVaultAccountId(signer)];
                                    case 7:
                                        pubKey = _d.sent();
                                        signedMessages.forEach(function (signedMessage) {
                                            var sigBuffer = Uint8Array.from(Buffer.from(signedMessage.signature.fullSig.replace("0x", ""), "hex"));
                                            var payloadHex = signedMessage.content.replace("0x", "");
                                            var signature = pubKey._toProtobufSignature(sigBuffer);
                                            if (signatures[payloadHex] === undefined) {
                                                signatures[payloadHex] = [signature];
                                            }
                                            else {
                                                signatures[payloadHex].push(signature);
                                            }
                                        });
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _a = 0, _b = this.signers;
                        _c.label = 3;
                    case 3:
                        if (!(_a < _b.length)) return [3 /*break*/, 6];
                        signer = _b[_a];
                        return [5 /*yield**/, _loop_1(signer)];
                    case 4:
                        _c.sent();
                        _c.label = 5;
                    case 5:
                        _a++;
                        return [3 /*break*/, 3];
                    case 6: return [2 /*return*/, signatures];
                }
            });
        });
    };
    FireblocksHederaClient.prototype.addSigner = function (vaultAccountId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _a.sent();
                        if (!this.signers.includes(vaultAccountId)) {
                            this.signers.push(vaultAccountId);
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    FireblocksHederaClient.prototype.getFireblocksAccountId = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, sdk_1.AccountId.fromString(this.accountId)];
                }
            });
        });
    };
    FireblocksHederaClient.prototype.getPublicKey = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, sdk_1.PublicKey.fromBytesED25519(this.vaultAccountPublicKey)];
                }
            });
        });
    };
    FireblocksHederaClient.prototype.getPublicKeyByVaultAccountId = function (vaultAccountId) {
        return __awaiter(this, void 0, void 0, function () {
            var pubKey, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.init()];
                    case 1:
                        _c.sent();
                        _b = (_a = Buffer).from;
                        return [4 /*yield*/, this.fireblocksSDK.vaults.getPublicKeyInfoForAddress({
                                vaultAccountId: vaultAccountId,
                                assetId: this.assetId,
                                change: 0,
                                addressIndex: 0,
                            })];
                    case 2:
                        pubKey = _b.apply(_a, [(_c.sent()).data.publicKey.replace("0x", ""),
                            "hex"]);
                        return [2 /*return*/, sdk_1.PublicKey.fromBytesED25519(pubKey)];
                }
            });
        });
    };
    FireblocksHederaClient.prototype.signTx = function (message) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, signMultipleMessages([message], this.config.vaultAccountId, this.fireblocksSDK, this.assetId, this.transactionPayloadSignatures)];
                    case 1: return [2 /*return*/, (_a.sent())[0]];
                }
            });
        });
    };
    FireblocksHederaClient.prototype.preSignTransaction = function (transaction) {
        return __awaiter(this, void 0, void 0, function () {
            var allBodyBytes, messagesToSign, signatures, publicKey, i, sigCounter, signedTransaction, bodyBytesHex;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        allBodyBytes = [];
                        transaction.setTransactionId(sdk_1.TransactionId.generate(this.accountId));
                        if (!transaction.isFrozen()) {
                            transaction.freezeWith(this);
                        }
                        //@ts-ignore
                        transaction._transactionIds.setLocked();
                        transaction._nodeAccountIds.setLocked();
                        transaction._signedTransactions.list.forEach(function (signedTx) { var _a; return allBodyBytes.push((_a = signedTx.bodyBytes) !== null && _a !== void 0 ? _a : Buffer.alloc(0)); });
                        messagesToSign = allBodyBytes.filter(function (bodyBytes) { return bodyBytes.length !== 0; });
                        return [4 /*yield*/, signMultipleMessages(messagesToSign, this.config.vaultAccountId, this.fireblocksSDK, this.assetId, this.transactionPayloadSignatures, "Signing ".concat(transaction.constructor.name, " with ").concat(allBodyBytes.length, " payloads for ").concat(allBodyBytes.length, " nodes"))];
                    case 1:
                        signatures = _a.sent();
                        publicKey = sdk_1.PublicKey.fromBytesED25519(this.vaultAccountPublicKey);
                        for (i = 0, sigCounter = 0; i < transaction._signedTransactions.length; i++) {
                            signedTransaction = transaction._signedTransactions.list[i];
                            if (!signedTransaction.bodyBytes) {
                                continue;
                            }
                            bodyBytesHex = signedTransaction.bodyBytes.length > 0
                                ? Buffer.from(signedTransaction.bodyBytes).toString("hex")
                                : "";
                            if (bodyBytesHex !== "") {
                                this.transactionPayloadSignatures[bodyBytesHex] =
                                    signatures[sigCounter];
                            }
                            sigCounter++;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    return FireblocksHederaClient;
}(sdk_1.Client));
exports.FireblocksHederaClient = FireblocksHederaClient;
function signMultipleMessages(messages, vaultAccountId, fireblocksSDK, assetId, transactionPayloadSignatures, customNote) {
    return __awaiter(this, void 0, void 0, function () {
        var signatures, messagesData, transactionTypesToSign, messagesForRawSigning, _i, messagesData_2, messageData, txId, tx, signedMessages;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    signatures = [];
                    if (messages.length === 0) {
                        return [2 /*return*/, signatures];
                    }
                    messagesData = messages.map(function (message, index) { return ({
                        typeToSign: "".concat(index + 1, ": ").concat(proto_1.proto.TransactionBody.decode(message).data),
                        message: message,
                    }); });
                    messages.forEach(function (message) {
                        var _a;
                        var messageHex = Buffer.from(message).toString("hex");
                        var sigBuffer = (_a = transactionPayloadSignatures[messageHex]) !== null && _a !== void 0 ? _a : Buffer.alloc(0);
                        signatures.push(sigBuffer);
                        if (sigBuffer.length > 0) {
                            delete transactionPayloadSignatures[messageHex];
                        }
                    });
                    // This checks that the number of signatures that are not of length 0 matches the number of messages.
                    // If it is it means that all messages were previously signed and cached.
                    if (signatures.filter(function (sig) { return sig.length !== 0; }).length === messages.length) {
                        return [2 /*return*/, signatures];
                    }
                    transactionTypesToSign = "";
                    messagesForRawSigning = [];
                    //TODO: Check for > 250
                    for (_i = 0, messagesData_2 = messagesData; _i < messagesData_2.length; _i++) {
                        messageData = messagesData_2[_i];
                        if (!messageData) {
                            transactionTypesToSign =
                                transactionTypesToSign === ""
                                    ? "Using cached"
                                    : transactionTypesToSign + "\n" + "using cached";
                            messagesForRawSigning.push({ content: "0".repeat(32) });
                            continue;
                        }
                        transactionTypesToSign =
                            transactionTypesToSign === ""
                                ? messageData.typeToSign
                                : transactionTypesToSign + "\n" + messageData.typeToSign;
                        messagesForRawSigning.push({
                            content: Buffer.from(messageData.message).toString("hex"),
                        });
                    }
                    return [4 /*yield*/, fireblocksSDK.transactions.createTransaction({
                            transactionRequest: {
                                assetId: assetId,
                                operation: ts_sdk_1.TransactionOperation.Raw,
                                note: customNote !== null && customNote !== void 0 ? customNote : "Signing: ".concat(transactionTypesToSign),
                                source: {
                                    id: "".concat(vaultAccountId),
                                    type: ts_sdk_1.TransferPeerPathType.VaultAccount,
                                },
                                extraParameters: {
                                    rawMessageData: {
                                        messages: messagesForRawSigning,
                                    },
                                },
                            },
                        })];
                case 1:
                    txId = (_a.sent()).data.id;
                    return [4 /*yield*/, fireblocksSDK.transactions.getTransaction({ txId: txId })];
                case 2:
                    tx = _a.sent();
                    _a.label = 3;
                case 3:
                    if (!!["BLOCKED", "REJECTED", "COMPLETED", "CANCELLED", "FAILED"].includes(tx.data.status)) return [3 /*break*/, 6];
                    console.log("Polling for Tx Id: ".concat(txId, ", status: ").concat(tx.data.status));
                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1000); })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, fireblocksSDK.transactions.getTransaction({ txId: txId })];
                case 5:
                    tx = _a.sent();
                    return [3 /*break*/, 3];
                case 6:
                    if (["BLOCKED", "REJECTED", "CANCELLED", "FAILED"].includes(tx.data.status)) {
                        throw "Transaction signature failed - ".concat((0, util_1.inspect)(tx, false, null, true));
                    }
                    console.log("txId: ".concat(txId, " finished"));
                    signedMessages = tx.data.signedMessages;
                    if (!signedMessages) {
                        throw new Error("No signed messages found after transaction finished.");
                    }
                    signedMessages.forEach(function (signedMessage) {
                        var sigBuffer = Buffer.from(signedMessage.signature.fullSig.replace("0x", ""), "hex");
                        var sigIndex = messages
                            .map(function (msg) {
                            return Buffer.from(msg).equals(Buffer.from(signedMessage.content.replace("0x", ""), "hex"));
                        })
                            .indexOf(true);
                        if (sigIndex === -1) {
                            throw new Error("Got signature for message which didn't request to sign");
                        }
                        signatures[sigIndex] = sigBuffer;
                    });
                    return [2 /*return*/, signatures];
            }
        });
    });
}
//@ts-ignore
sdk_1.Transaction.prototype.signWith = transaction_signWith_1.signWith;
//@ts-ignore
sdk_1.Query.prototype._beforeExecute = query__beforeExecute_1._beforeExecute;
