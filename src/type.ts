import { AccountId, PublicKey, Transaction } from "@hashgraph/sdk";

export enum ApiBaseUrl {
  Sandbox = "https://sandbox-api.fireblocks.io/v1",
  US = "https://api.fireblocks.io/v1",
  EU = "https://eu-api.fireblocks.io/v1",
  EU2 = "https://eu2-api.fireblocks.io/v1",
}

export interface FireblocksHederaSignerAdditionalFunctionality {
  /**
   * In case you use {@see FireblocksHederaClientConfig.maxNumberOfPayloadsPerRequest}, you can use this function
   * to pre-sign all the potential payloads of the transaction. This will result in the transaction not having to be
   * signed during execution of its _beforeExecute function call.
   * @param transaction The transaction to sign
   */
  preSignTransaction<T extends Transaction>(transaction: T): Promise<void>;

  /**
   * Gets the account ID associated with the specified {@link FireblocksHederaClientConfig} provided.
   * Is async because we might need to initiate the client beforehand, if not yet initiated.
   */
  getFireblocksAccountId(): Promise<AccountId>;

  /**
   * Gets the public key associated with the vault account specified in the {@link FireblocksHederaClientConfig} provided.
   * Is async because we might need to initiate the client beforehand, if not yet initiated.
   */
  getPublicKey(): Promise<PublicKey>;
}

export type FireblocksHederaClientConfig = {
  /**
   * The API User's private key's path
   */
  privateKey: string;

  /**
   * The API User's API key
   */
  apiKey: string;

  /**
   * The vault account to use
   */
  vaultAccountId: number;

  /**
   * Is it testnet
   */
  testnet?: boolean;

  /**
   * The API Endpoint to use, if such is relevant (sandbox, production, etc.)
   */
  apiEndpoint?: ApiBaseUrl;

  /**
   * Hedera SDK allows for signing the same transaction for multiple nodes. This allows us to
   * send the transaction to various nodes until one of them accepts it.
   * This means that for each payload we submit a raw signing transaction.
   * By default this is set to 1, if you wish to set it to some larger number, it's completely fine, however in that scenario we
   * suggest to pre-sign the transactions instead of using the standard notation.
   * @see FireblocksHederaSignerAdditionalFunctionality.preSignTransaction
   */
  maxNumberOfPayloadsPerTransaction?: number;
};
