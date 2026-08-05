import { Module } from '@nestjs/common';
import { ClientsService } from './application/clients.service';
import { ClientsController } from './presentation/clients.controller';
import { PrismaClientRepository } from './infrastructure/prisma-client.repository';
import { CLIENT_REPOSITORY } from './domain/ports';

@Module({
  controllers: [ClientsController],
  providers: [
    ClientsService,
    { provide: CLIENT_REPOSITORY, useClass: PrismaClientRepository },
  ],
  exports: [ClientsService, CLIENT_REPOSITORY],
})
export class ClientsModule {}
