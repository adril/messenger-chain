import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { AddBlockDto } from './dto/add-block.dto';
import { CreateMessageSignedDto } from './dto/create-message-signed.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { RegisterNodeDto } from './dto/register-node.dto';
import { Block } from './entity/block';
import { Message } from './entity/message';
import { MessengerChainService } from './messenger-chain.service';

@Controller('messenger-chain')
export class MessengerChainController {
  constructor(private readonly messengerChainService: MessengerChainService) {}

  @Get('list')
  getList(): Block[] {
    return this.messengerChainService.list();
  }

  @Post('message')
  addNewMessage(@Body() createMessageDto: CreateMessageDto): Message {
    return this.messengerChainService.addNewMessage(createMessageDto);
  }

  @Post('message-signed')
  addNewMessageSigned(
    @Body() createMessageSignedDto: CreateMessageSignedDto,
  ): Message {
    return this.messengerChainService.addNewMessageSigned(
      createMessageSignedDto,
    );
  }

  @Get('check-chain-validity')
  getCheckChainValidity(): boolean {
    return this.messengerChainService.isBlockchainValid();
  }

  // FixMe: add register node method
  // as, cf https://grokonez.com/node-js/how-to-synchronize-blockchain-network-javascript-tutorial
  @Post('register-node')
  registerNode(@Body() registerNodeDto: RegisterNodeDto): void {
    return this.messengerChainService.registerNode(registerNodeDto);
  }

  @Get('list-nodes')
  getListNodes(): string[] {
    return this.messengerChainService.listNodes();
  }

  @Get('synchronize')
  async synchronizeBlockchain(): Promise<void> {
    // INFO: Blockchain is synch with static url, it could be based on registred nodes
    return await this.messengerChainService.loadBlockchainWithNode(
      'http://localhost:3000',
    );
  }

  @Post('transaction')
  transaction(@Body() addBlockDto: AddBlockDto): void {
    return this.messengerChainService.addNewBlockDto(addBlockDto);
  }

  @Get('generate-keys')
  generateKeys(): any {
    return this.messengerChainService.generateKeys();
  }

  @Get('messages/:address')
  getAllMessagesForWallet(@Param('address') address: string): Message[] {
    return this.messengerChainService.getAllMessagesForWallet(address);
  }

  @Get('balance/:address')
  getBalanceForWallet(@Param('address') address: string): number {
    return this.messengerChainService.getBalanceOfAddress(address);
  }

  @Post('mine-pending-messages')
  minePendingMessages(): void {
    return this.messengerChainService.minePendingMessages(
      '0471a760b7226e87e15d285795db4925939363feedf2b943f61d5ced178e04c30eed0c6c7265975a698c5594a1b367abd37db45c4abf890ced6053dd1d3e6f5aca',
    );
  }

  @Get('test')
  getTest(): string {
    return this.messengerChainService.test();
  }
}

/*

MAIN:

Your public key (also your wallet address, freely shareable)
 0471a760b7226e87e15d285795db4925939363feedf2b943f61d5ced178e04c30eed0c6c7265975a698c5594a1b367abd37db45c4abf890ced6053dd1d3e6f5aca

Your private key (keep this secret! To sign transactions)
 4b9fcaafc0369658d90c4766479ece266794502c6c834145475f4707073187f3
*/

/*

SECOND:

{
  "publicKey": "38b8200718a2cf5ed9425e434df52e1180d2f1d6a520668b03f709aaeece3940",
  "privateKey": "bfb17d049b4ee2c9bec3bd93607e255a8c4f2ac85e6c3cdb18b2a66bada36e28"
}

*/
