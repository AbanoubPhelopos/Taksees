import { Module } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ClassService, CLASS_REPOSITORY, USER_DIRECTORY } from './services/class.service';
import { MemberService, MEMBER_REPOSITORY } from './services/member.service';
import { ServantClassService, SERVANT_CLASS_REPOSITORY } from './services/servant-class.service';
import { PrismaClassRepository } from './repositories/prisma-class.repository';
import { PrismaMemberRepository } from './repositories/prisma-member.repository';
import { PrismaServantClassRepository } from './repositories/prisma-servant-class.repository';
import { PrismaUserDirectory } from './repositories/prisma-user-directory';
import { ClassesController } from './controllers/classes.controller';
import { MembersController, MemberItemController } from './controllers/members.controller';
import { ServantsController } from './controllers/servants.controller';

@Module({
  controllers: [ClassesController, MembersController, MemberItemController, ServantsController],
  providers: [
    PrismaService,
    { provide: CLASS_REPOSITORY, useClass: PrismaClassRepository },
    { provide: MEMBER_REPOSITORY, useClass: PrismaMemberRepository },
    { provide: SERVANT_CLASS_REPOSITORY, useClass: PrismaServantClassRepository },
    { provide: USER_DIRECTORY, useClass: PrismaUserDirectory },
    ClassService,
    MemberService,
    ServantClassService,
  ],
  exports: [ClassService, MemberService, ServantClassService],
})
export class ClassesModule {}
