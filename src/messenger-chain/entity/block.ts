import { Type } from 'class-transformer';
import * as crypto from 'crypto';
import { Message } from './message';

export class Block {
  timestamp: number;
  @Type(() => Message)
  messages: Message[];
  previousHash: string;
  nonce: number;
  hash: string;

  constructor(messages: Message[], previousHash = '') {
    this.timestamp = Date.now();
    this.messages = messages;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.hash = this.computeHash();
  }

  computeHash() {
    // INFO: Compute this Block's hash
    const strBlock =
      this.previousHash +
      this.timestamp +
      JSON.stringify(this.messages) +
      this.nonce;

    // INFO: Hash string with SHA256 encrpytion
    return crypto.createHash('sha256').update(strBlock).digest('hex');
  }

  mineBlock(difficulty: number) {
    while (
      this.hash?.substring(0, difficulty) !== Array(difficulty + 1).join('0')
    ) {
      this.nonce++;
      this.hash = this.computeHash();
    }
    console.log(`Block mined: ${this.hash}`);
  }

    /**
   * Validates all the messages inside this block (signature + hash) and
   * returns true if everything checks out. False if the block is invalid.
   *
   * @returns {boolean}
   */
     hasValidMessages(): boolean {
      for (const msg of this.messages) {
        if (!msg?.isValid()) {
          return false;
        }
      }
      return true;
    }
}
