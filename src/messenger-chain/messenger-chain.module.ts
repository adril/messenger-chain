import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessengerChainController } from './messenger-chain.controller';
import { MessengerChainService } from './messenger-chain.service';

@Module({
  imports: [ConfigModule],
  controllers: [MessengerChainController],
  providers: [MessengerChainService],
})
export class MessengerChainModule {}
