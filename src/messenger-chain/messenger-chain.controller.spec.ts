import { Test, TestingModule } from '@nestjs/testing';
import { MessengerChainController } from './messenger-chain.controller';

describe('MessengerChainController', () => {
  let controller: MessengerChainController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessengerChainController],
    }).compile();

    controller = module.get<MessengerChainController>(MessengerChainController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
