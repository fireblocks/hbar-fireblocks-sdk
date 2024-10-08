import { AccountId, Client, PublicKey, Transaction } from '@hashgraph/sdk';
import { Fireblocks } from '@fireblocks/ts-sdk';
import { FireblocksHederaSignerAdditionalFunctionality, FireblocksHederaClientConfig } from './type';
import { Signer } from '@hashgraph/sdk/lib/Signer';
export declare class FireblocksHederaClient extends Client implements FireblocksHederaSignerAdditionalFunctionality {
    private config;
    private fireblocksSDK;
    private accountId;
    private assetId;
    private vaultAccountPublicKey;
    private transactionPayloadSignatures;
    constructor(config: FireblocksHederaClientConfig);
    /**
     * Creates a Signer object that can be used in conjunction with this client for multi-signature transactions.
     * @param vaultAccountId The vault account ID you'd like to sign with
     * @returns A {@link Signer} object that will sign using the provided vaultAccountId.
     */
    getSigner(vaultAccountId: number): Promise<Signer>;
    private populateVaultAccountData;
    init(): Promise<void>;
    private setupUndelyingClient;
    getFireblocksAccountId(): Promise<AccountId>;
    getPublicKey(): Promise<PublicKey>;
    private signTx;
    preSignTransaction<T extends Transaction>(transaction: T): Promise<void>;
}
export declare function signMultipleMessages(messages: Uint8Array[], vaultAccountId: number, fireblocksSDK: Fireblocks, assetId: string, transactionPayloadSignatures: {
    [key: string]: Uint8Array;
}, customNote?: string): Promise<Uint8Array[]>;
