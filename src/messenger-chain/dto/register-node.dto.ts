import { ApiProperty } from '@nestjs/swagger';

export class RegisterNodeDto {
  @ApiProperty({
    type: String,
    description: 'The node url to register',
    default: 'http://localhost:3000',
  })
  url: string;
}
