import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { Block } from './entity/block';
import { plainToClass } from 'class-transformer';
import { RegisterNodeDto } from './dto/register-node.dto';
import { AddBlockDto } from './dto/add-block.dto';
import { Message } from './entity/message';
import { ConfigService } from '@nestjs/config';
import { CreateMessageSignedDto } from './dto/create-message-signed.dto';
const fs = require('fs');
const jfe = require('json-file-encrypt');
const reqPromise = require('request-promise');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

@Injectable()
export class MessengerChainService {
  difficulty = 2;
  miningReward = 10;
  blockchain: Block[] = null;
  pendingMessages: Message[] = [];
  nodes: string[] = [];
  // INFO: key for blockchain file encryption
  key = new jfe.encryptor(this.configService.get('PRIVATE_KEY_FILE_ENCRYPTOR'));
  saveEncryptedEnabled = true;
  saveJsonEnabled = true;
  loadEncryptedEnabled = true;
  loadJsonEnabled = false;
  // INFO: Signing messages - private key generated with generateKeys
  myKey = ec.keyFromPrivate(this.configService.get('PRIVATE_KEY'));
  myWalletAddress = this.myKey.getPublic('hex');

  constructor(private configService: ConfigService) {
    // INFO: if file exists load blockchain from file else create new blockchain
    this.loadBlockchain();
    if ((this.blockchain?.length ?? 0) === 0) {
      console.log('new blockchain created');
      // INFO: Initialize a new array of blocks, starting with a genesis block
      this.blockchain = [this.startGenesisBlock()];
    } else {
      console.log(
        `blockchain loaded from file: ${this.blockchain.length} blocks`,
      );
    }
  }

  private startGenesisBlock(): Block {
    // INFO: Create an empty block to start
    return new Block([new Message(null, null, null)]);
  }

  private getLatestBlock(): Block {
    return this.blockchain[this.blockchain.length - 1]; // Get last block on the chain
  }

  private addNewBlock(newBlock: Block): Block {
    newBlock.previousHash = this.getLatestBlock().hash;
    newBlock.mineBlock(this.difficulty);
    this.blockchain.push(newBlock);
    this.saveBlockchainIfValid();
    this.notifyBlockAdded(newBlock);
    return newBlock;
  }

  addNewMessage(createMessageDto: CreateMessageDto): Message {
    const msg = plainToClass(Message, createMessageDto);

    try {
      // FixMe: message should be signed on client
      msg.signMessage(this.myKey);
      this.addMessage(msg);
    } catch (error) {
      console.log(error);
      throw error;
    }
    return msg;
  }

  addNewMessageSigned(createMessageSignedDto: CreateMessageSignedDto): Message {
    const msg = plainToClass(Message, createMessageSignedDto);

    try {
      this.addMessage(msg);
    } catch (error) {
      console.log(error);
      throw error;
    }
    return msg;
  }

  /**
   * Loops over all the blocks in the chain and verify if they are properly
   * linked together and nobody has tampered with the hashes. By checking
   * the blocks it also verifies the (signed) transactions inside of them.
   *
   * @returns {boolean}
   */
  isBlockchainValid(): boolean {
    // Check the remaining blocks on the chain to see if there hashes and
    // signatures are correct
    for (let i = 1; i < this.blockchain.length; i++) {
      const currentBlock = this.blockchain[i];
      const previousBlock = this.blockchain[i - 1];

      if (previousBlock.hash !== currentBlock.previousHash) {
        return false;
      }
      if (!currentBlock.hasValidMessages()) {
        return false;
      }
      if (currentBlock.hash !== currentBlock.computeHash()) {
        return false;
      }
    }
    return true;
  }

  list(): Block[] {
    return this.blockchain;
  }

  saveBlockchainIfValid(): void {
    if (this.isBlockchainValid()) {
      this.saveBlockchain();
    } else {
      throw new BadRequestException('blockchain is not valid');
    }
  }

  saveBlockchain(): void {
    const jsonString = JSON.stringify(this.blockchain, null, 2);
    const jsonEncrypted = this.key.encrypt(jsonString);

    if (this.saveEncryptedEnabled) {
      fs.writeFile('./blockchain-encrypted', jsonEncrypted, (err) => {
        if (err) {
          console.log('error writing json encrypted file', err);
        } else {
          console.log('successfully wrote json encrypted file');
        }
      });
    }
    if (this.saveJsonEnabled) {
      fs.writeFile('./blockchain.json', jsonString, (err) => {
        if (err) {
          console.log('error writing json file', err);
        } else {
          console.log('successfully wrote json file');
        }
      });
    }
  }

  loadBlockchain(): void {
    let json = null;

    if (this.loadEncryptedEnabled) {
      try {
        console.log('loading encrypted blockchain');
        const jsonEncrypted = fs.readFileSync('./blockchain-encrypted', 'utf8');

        json = JSON.parse(this.key.decrypt(jsonEncrypted));
      } catch (error) {
        console.log(error);
      }
    }
    if (this.loadJsonEnabled) {
      try {
        console.log('loading json blockchain');
        json = JSON.parse(fs.readFileSync('./blockchain.json', 'utf8'));
      } catch (error) {
        console.log(error);
      }
    }
    this.blockchain = plainToClass(Block, json as Object[]);
  }

  async loadBlockchainWithNode(node: string): Promise<void> {
    try {
      const requestOptions = {
        uri: node + '/messenger-chain/list',
        method: 'GET',
        json: true,
      };

      const blockchainResponse = await reqPromise(requestOptions);

      console.log(blockchainResponse);
      this.blockchain = plainToClass(Block, blockchainResponse as Object[]);
      console.log(`blockchain is synchronized from ${node}`);
      this.saveBlockchainIfValid();
    } catch (error) {
      console.log(error);
    }
  }

  notifyBlockAdded(blockAdded: Block) {
    console.log(`new block added: hash: ${blockAdded.hash}`);
    const requests = [];

    this.nodes?.forEach((networkNode) => {
      const requestOptions = {
        uri: networkNode + '/messenger-chain/transaction',
        method: 'POST',
        body: blockAdded,
        json: true,
      };

      requests.push(reqPromise(requestOptions));
    });

    Promise.all(requests).then((data) => {
      // console.log(data);
      console.log(`Creating and broadcasting Transaction successfully!`);
    });
  }

  addNewBlockDto(addBlockDto: AddBlockDto) {
    const block: Block = plainToClass(Block, addBlockDto);

    console.log(`potential block to add: hask: ${block.hash}`);
    const lastBlock = this.getLatestBlock();

    if (
      lastBlock?.hash === block?.hash &&
      lastBlock?.previousHash === block?.previousHash
    ) {
      throw new UnauthorizedException('block already exist in blockchain');
    }
    this.blockchain.push(block);
    if (!this.isBlockchainValid()) {
      throw new BadRequestException('blockchain is not valid');
    }
    console.log(`block is added to blockchain: hask: ${block.hash}`);
    this.saveBlockchainIfValid();
  }

  registerNode(registerNodeDto: RegisterNodeDto) {
    this.nodes.push(registerNodeDto.url);
  }

  listNodes(): string[] {
    return this.nodes;
  }

  // INFO: keys

  generateKeys(): any {
    console.log('generate keys');

    // Generate a new key pair and convert them to hex-strings
    const key = ec.genKeyPair();
    const publicKey = key.getPublic('hex');
    const privateKey = key.getPrivate('hex');

    // Print the keys to the console
    console.log();
    console.log(
      'Your public key (also your wallet address, freely shareable)\n',
      publicKey,
    );

    console.log();
    console.log(
      'Your private key (keep this secret! To sign messages)\n',
      privateKey,
    );
    return { publicKey, privateKey };
  }

  // INFO: add message

  addMessage(message: Message) {
    if (!message.fromAddress) {
      throw new Error('message must include from');
    }

    // Verify the message
    if (!message.isValid()) {
      throw new Error('Cannot add invalid message to chain');
    }
    if (message.amount < 0) {
      throw new Error('message amount should be higher than 0');
    }
    // Making sure that the amount sent is not greater than existing balance
    if (this.getBalanceOfAddress(message?.fromAddress) < message?.amount) {
      throw new Error('Not enough balance');
    }
    // FixMe: experimental - to avoid to exceed balance with pending messages
    // if ((this.getBalancePendingOfAddress(message?.fromAddress) + (message?.amount ?? 0)) < this.getBalanceOfAddress(message?.fromAddress)) {
    //   throw new Error('Not enough balance (counting pending balance)');
    // }
    this.pendingMessages.push(message);
    console.log('message added: %s', message);
  }

  /**
   * Takes all the pending messages, puts them in a Block and starts the
   * mining process. It also adds a transaction to send the mining reward to
   * the given address.
   *
   * @param {string} miningRewardAddress
   */
  minePendingMessages(miningRewardAddress): void {
    console.log(
      `start mine pending messages: count: ${this.pendingMessages?.length}`,
    );
    const rewardMessage = new Message(
      null,
      null,
      miningRewardAddress,
      this.miningReward,
    );
    this.pendingMessages.push(rewardMessage);
    const block = new Block(this.pendingMessages, this.getLatestBlock().hash);

    this.addNewBlock(block);
    console.log('did mine pending messages');
    this.pendingMessages = [];
  }

  /**
   * Returns the balance of a given wallet address.
   *
   * @param {string} address
   * @returns {number} The balance of the wallet
   */
  getBalanceOfAddress(address: string): number {
    let balance = 0;

    for (const block of this.blockchain) {
      for (const msg of block?.messages) {
        if (msg?.fromAddress === address) {
          balance -= msg.amount;
        }
        if (msg?.toAddress === address) {
          balance += msg.amount;
        }
      }
    }
    console.log('getBalanceOfAddress: %s', balance);
    return balance;
  }

  getBalancePendingOfAddress(address: string): number {
    // FixMe: experimental -> to review
    let balancePending = 0;

    for (const msg of this.pendingMessages) {
      if (msg?.fromAddress === address) {
        balancePending -= msg.amount;
      }
      if (msg?.toAddress === address) {
        balancePending += msg.amount;
      }
    }
    console.log('getBalancePendingOfAddress: %s', balancePending);
    return balancePending;
  }

  /**
   * Returns a list of all transactions that happened
   * to and from the given wallet address.
   *
   * @param  {string} address
   * @return {Transaction[]}
   */
  getAllMessagesForWallet(address: string): Message[] {
    const msgs: Message[] = [];

    for (const block of this.blockchain) {
      for (const msg of block?.messages) {
        if (msg?.fromAddress === address || msg?.toAddress === address) {
          msgs.push(msg);
        }
      }
    }
    console.log(`get messages for wallet ${address} count: %s`, msgs.length);
    return msgs;
  }

  test(): string {
    const toWalletAddress =
      '041f752d4466615ee10cd31734ee39ee976764aaaf0d108a4f3eb4980e3c6b2c89f650096b445a233ff610209a5660cd7c5561b831fc6835f97d5f08c82fccf1d2';
    // INFO: create a message & sign it with your key
    const msg = new Message(
      'Hello test, send 0',
      this.myWalletAddress,
      toWalletAddress,
      0,
    );
    const msg1 = new Message(
      'Hello test, send 1',
      this.myWalletAddress,
      toWalletAddress,
      1,
    );
    const msg2 = new Message(
      'Hello test, send 1',
      this.myWalletAddress,
      toWalletAddress,
      1,
    );
    const msg3 = new Message(
      'Hello test, send 100',
      this.myWalletAddress,
      toWalletAddress,
      100,
    );
    const msg4 = new Message(
      'Hello test, send 100',
      '041f752d4466615ee10cd31734ee39ee976764aaaf0d108a4f3eb4980e3c6b2c89f650096b445a233ff610209a5660cd7c5561b831fc6835f97d5f08c82fccf1d2',
      this.myWalletAddress,
      100,
    );

    try {
      msg.signMessage(this.myKey);
      this.addMessage(msg);
    } catch (error) {
      console.log(error);
    }
    try {
      msg1.signMessage(this.myKey);
      this.addMessage(msg1);
    } catch (error) {
      console.log(error);
    }
    try {
      msg2.signMessage(this.myKey);
      this.addMessage(msg2);
    } catch (error) {
      console.log(error);
    }
    try {
      msg3.signMessage(this.myKey);
      this.addMessage(msg3);
    } catch (error) {
      console.log(error);
    }
    try {
      const mySecondKey = ec.keyFromPrivate(
        'bfb17d049b4ee2c9bec3bd93607e255a8c4f2ac85e6c3cdb18b2a66bada36e28',
      );
      // myWalletAddress = this.myKey.getPublic('hex');

      msg4.signMessage(mySecondKey);
      this.addMessage(msg4);
    } catch (error) {
      console.log(error);
    }
    this.minePendingMessages(this.myWalletAddress);
    // INFO: uncoment to invalid blockchain validity
    // this.blockchain[0].messages[0].amount = 11;
    const isBlockchainValid =
      'Blockchain validity: ' + this.isBlockchainValid();

    return isBlockchainValid;
  }
}
