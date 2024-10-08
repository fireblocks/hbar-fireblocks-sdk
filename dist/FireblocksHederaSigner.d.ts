import { AccountBalance, AccountId, AccountInfo, Executable, Key, LedgerId, PublicKey, Signer, SignerSignature, Transaction, TransactionRecord } from '@hashgraph/sdk';
import { FireblocksHederaClient } from './FireblocksHederaClient';
import { Fireblocks } from '@fireblocks/ts-sdk';
import { FireblocksHederaSignerAdditionalFunctionality } from './type';
/**
 * A signer that uses Fireblocks as the signing functionality.
 * This signer implements certain fucntions following {@link Wallet} implementation
 */
export declare class FireblocksHederaSigner implements Signer, FireblocksHederaSignerAdditionalFunctionality {
    private fireblocksSDK;
    private assetId;
    private vaultAccountId;
    private accountId;
    private vaultAccountPublicKey;
    private ledgerId;
    private network;
    private mirrorNetwork;
    private client;
    private publicKey;
    private cachedTransactionPayloadSignatures;
    constructor(fireblocksSDK: Fireblocks, assetId: string, vaultAccountId: number, testnet?: boolean, client?: FireblocksHederaClient, ledgerId?: LedgerId, network?: {
        [key: string]: string | AccountId;
    }, mirrorNetwork?: string[]);
    preSignTransaction<T extends Transaction>(transaction: T): Promise<void>;
    getPublicKey(): Promise<PublicKey>;
    init(): Promise<void>;
    getLedgerId(): LedgerId;
    getFireblocksAccountId(): Promise<AccountId>;
    getAccountId(): AccountId;
    getAccountKey(): Key;
    getNetwork(): {
        [key: string]: string | AccountId;
    };
    getMirrorNetwork(): string[];
    getAccountBalance(): Promise<AccountBalance>;
    getAccountInfo(): Promise<AccountInfo>;
    getAccountRecords(): Promise<TransactionRecord[]>;
    sign(messages: Uint8Array[]): Promise<SignerSignature[]>;
    signTransaction<T extends Transaction>(transaction: T): Promise<T>;
    checkTransaction<T extends Transaction>(transaction: T): Promise<T>;
    populateTransaction<T extends Transaction>(transaction: T): Promise<T>;
    call<RequestT, ResponseT, OutputT>(request: Executable<RequestT, ResponseT, OutputT>): Promise<OutputT>;
}
