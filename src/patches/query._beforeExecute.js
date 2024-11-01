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
exports._beforeExecute = _beforeExecute;
var proto_1 = require("@hashgraph/proto");
var sdk_1 = require("@hashgraph/sdk");
function _beforeExecute(client) {
    return __awaiter(this, void 0, void 0, function () {
        var cost, maxQueryPayment, actualCost, payloadsToSign, _i, _a, nodeId, logId, paymentTransactionId, paymentAmount, _b, _c, signedPayloads, payload, transactionBodyBytes, allSignatures, signedTransaction;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    // If we're executing this query multiple times the the payment transaction ID list
                    // will already be set
                    if (this._paymentTransactions.length > 0) {
                        return [2 /*return*/];
                    }
                    // Check checksums if enabled
                    if (client.isAutoValidateChecksumsEnabled()) {
                        this._validateChecksums(client);
                    }
                    // If the nodes aren't set, set them.
                    if (this._nodeAccountIds.isEmpty) {
                        this._nodeAccountIds.setList(client._network.getNodeAccountIdsForExecute());
                    }
                    // Save the operator
                    this._operator = this._operator != null ? this._operator : client._operator;
                    // If the payment transaction ID is not set
                    if (this._paymentTransactionId == null) {
                        // And payment is required
                        if (this._isPaymentRequired()) {
                            // And the client has an operator
                            if (this._operator != null) {
                                // Generate the payment transaction ID
                                this._paymentTransactionId = sdk_1.TransactionId.generate(this._operator.accountId);
                            }
                            else {
                                // If payment is required, but an operator did not exist, throw an error
                                throw new Error("`client` must have an `operator` or an explicit payment transaction must be provided");
                            }
                        }
                        else {
                            // If the payment transaction ID is not set, but this query doesn't require a payment
                            // set the payment transaction ID to an empty transaction ID.
                            // FIXME: Should use `TransactionId.withValidStart()` instead
                            this._paymentTransactionId = sdk_1.TransactionId.generate(new sdk_1.AccountId(0));
                        }
                    }
                    cost = new sdk_1.Hbar(0);
                    maxQueryPayment = this._maxQueryPayment != null
                        ? this._maxQueryPayment
                        : client.defaultMaxQueryPayment;
                    if (!(this._queryPayment != null)) return [3 /*break*/, 1];
                    cost = this._queryPayment;
                    return [3 /*break*/, 3];
                case 1:
                    if (!(this._paymentTransactions.length === 0 &&
                        this._isPaymentRequired())) return [3 /*break*/, 3];
                    return [4 /*yield*/, this.getCost(client)];
                case 2:
                    actualCost = _d.sent();
                    // Confirm it's less than max query payment
                    if (maxQueryPayment.toTinybars().toInt() < actualCost.toTinybars().toInt()) {
                        throw new sdk_1.MaxQueryPaymentExceeded(actualCost, maxQueryPayment);
                    }
                    cost = actualCost;
                    if (this._logger) {
                        this._logger.debug("[".concat(this._getLogId(), "] received cost for query ").concat(cost.toString()));
                    }
                    _d.label = 3;
                case 3:
                    // Set the either queried cost, or the original value back into `queryPayment`
                    // in case a user executes same query multiple times. However, users should
                    // really not be executing the same query multiple times meaning this is
                    // typically not needed.
                    this._queryPayment = cost;
                    // Not sure if we should be overwritting this field tbh.
                    this._timestamp = Date.now();
                    this._nodeAccountIds.setLocked();
                    payloadsToSign = [];
                    _i = 0, _a = this._nodeAccountIds.list;
                    _d.label = 4;
                case 4:
                    if (!(_i < _a.length)) return [3 /*break*/, 7];
                    nodeId = _a[_i];
                    logId = this._getLogId();
                    paymentTransactionId = 
                    /** @type {import("../transaction/TransactionId.js").default} */ this
                        ._paymentTransactionId;
                    paymentAmount = this._queryPayment;
                    if (this._logger) {
                        this._logger.debug("[".concat(logId, "] making a payment transaction for node ").concat(nodeId.toString(), " and transaction ID ").concat(paymentTransactionId.toString(), " with amount ").concat(paymentAmount.toString()));
                    }
                    _c = (_b = payloadsToSign).push;
                    return [4 /*yield*/, _makePaymentTransactionPayload(paymentTransactionId, nodeId, this._isPaymentRequired() ? this._operator : null, paymentAmount)];
                case 5:
                    _c.apply(_b, [_d.sent()]);
                    _d.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7: return [4 /*yield*/, client
                        .getOperator()
                        //@ts-ignore
                        .transactionSigner(payloadsToSign)];
                case 8:
                    signedPayloads = _d.sent();
                    //@ts-ignore
                    for (payload in signedPayloads) {
                        transactionBodyBytes = Buffer.from(payload, "hex");
                        allSignatures = signedPayloads[payload];
                        signedTransaction = {
                            bodyBytes: transactionBodyBytes,
                            sigMap: {
                                sigPair: allSignatures,
                            },
                        };
                        this._paymentTransactions.push({
                            signedTransactionBytes: proto_1.proto.SignedTransaction.encode(signedTransaction).finish(),
                        });
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function _makePaymentTransactionPayload(paymentTransactionId, nodeId, operator, paymentAmount) {
    return __awaiter(this, void 0, void 0, function () {
        var accountAmounts, body;
        return __generator(this, function (_a) {
            accountAmounts = [];
            // If an operator is provided then we should make sure we transfer
            // from the operator to the node.
            // If an operator is not provided we simply create an effectively
            // empty account amounts
            if (operator != null) {
                accountAmounts.push({
                    accountID: operator.accountId._toProtobuf(),
                    amount: paymentAmount.negated().toTinybars(),
                });
                accountAmounts.push({
                    accountID: nodeId._toProtobuf(),
                    amount: paymentAmount.toTinybars(),
                });
            }
            else {
                accountAmounts.push({
                    accountID: new sdk_1.AccountId(0)._toProtobuf(),
                    // If the account ID is 0, shouldn't we just hard
                    // code this value to 0? Same for the latter.
                    amount: paymentAmount.negated().toTinybars(),
                });
                accountAmounts.push({
                    accountID: nodeId._toProtobuf(),
                    amount: paymentAmount.toTinybars(),
                });
            }
            body = {
                transactionID: paymentTransactionId._toProtobuf(),
                nodeAccountID: nodeId._toProtobuf(),
                transactionFee: new sdk_1.Hbar(1).toTinybars(),
                transactionValidDuration: {
                    seconds: sdk_1.Long.fromNumber(120),
                },
                cryptoTransfer: {
                    transfers: {
                        accountAmounts: accountAmounts,
                    },
                },
            };
            return [2 /*return*/, proto_1.proto.TransactionBody.encode(body).finish()];
        });
    });
}
