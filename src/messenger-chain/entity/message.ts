import * as crypto from 'crypto';

export class Message {
  message: string;
  fromAddress: string;
  toAddress: string;
  pictures: string[];
  movies: string[];
  links: string[];
  voices: string[];
  amount: number;
  timestamp: number;

  signature: string;

  constructor(
    message: string,
    fromAddress: string,
    toAddress: string,
    amount: number = 0,
  ) {
    this.message = message;
    this.amount = amount;
    this.fromAddress = fromAddress;
    this.toAddress = toAddress;
    this.timestamp = Date.now();
  }

  calculateHash(): string {
    return crypto
      .createHash('sha256')
      .update(
        this.message +
          this.fromAddress +
          this.toAddress +
          JSON.stringify(this.pictures) +
          JSON.stringify(this.movies) +
          JSON.stringify(this.links) +
          JSON.stringify(this.voices) +
          this.amount +
          this.timestamp,
      )
      .digest('hex');
  }

  /**
   * Signs a message with the given signingKey (which is an Elliptic keypair
   * object that contains a private key). The signature is then stored inside the
   * message object and later stored on the blockchain.
   *
   * @param {string} signingKey
   */
  signMessage(signingKey): void {
    // You can only send a message from the wallet that is linked to your
    // key. So here we check if the fromAddress matches your publicKey
    if (signingKey.getPublic('hex') !== this.fromAddress) {
      throw new Error('You cannot sign messages for other wallets!');
    }

    // INFO: Calculate the hash of this message, sign it with the key
    // and store it inside the message obect
    const hashTx = this.calculateHash();
    const sig = signingKey.sign(hashTx, 'base64');

    this.signature = sig.toDER('hex');
  }

  /**
   * Checks if the signature is valid (message has not been tampered with).
   * It uses the fromAddress as the public key.
   *
   * @returns {boolean}
   */
  isValid(): boolean {
    const EC = require('elliptic').ec;

    // You can use any elliptic curve you want
    const ec = new EC('secp256k1');
    // If the message doesn't have a from address we assume it's a
    // mining reward and that it's valid. You could verify this in a
    // different way (special field for instance)
    if (this.fromAddress === null) return true;

    if (!this.signature || this.signature.length === 0) {
      throw new Error('No signature in this message');
    }

    const publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
    return publicKey.verify(this.calculateHash(), this.signature);
  }
}
