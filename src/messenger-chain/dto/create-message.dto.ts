import { ApiProperty } from '@nestjs/swagger';

export class CreateMessageDto {
  @ApiProperty({
    type: Number,
    description: 'The message to send',
    default: 'Hello messenger chain!',
  })
  message: string;

  @ApiProperty({
    type: Number,
    description: 'The sender',
    default: '0471a760b7226e87e15d285795db4925939363feedf2b943f61d5ced178e04c30eed0c6c7265975a698c5594a1b367abd37db45c4abf890ced6053dd1d3e6f5aca',
  })
  fromAddress: string;
  @ApiProperty({
    type: Number,
    description: 'The receiver',
    default: '38b8200718a2cf5ed9425e434df52e1180d2f1d6a520668b03f709aaeece3940',
  })
  toAddress: string;
}
