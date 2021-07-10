import { Test, TestingModule } from '@nestjs/testing';
import { MessengerChainService } from './messenger-chain.service';

describe('MessengerChainService', () => {
  let service: MessengerChainService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessengerChainService],
    }).compile();

    service = module.get<MessengerChainService>(MessengerChainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
