import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { ClassTenantGuard } from '../../../common/guards/class-tenant.guard';
import {
  AddMemberDto,
  AddMemberSchema,
  ListMembersQueryDto,
  ListMembersQuerySchema,
  UpdateMemberDto,
  UpdateMemberSchema,
} from '../dto/classes.dto';
import { MemberService } from '../services/member.service';

@ApiTags('members')
@UseGuards(ClassTenantGuard)
@Controller('classes/:classId/members')
export class MembersController {
  constructor(private readonly memberService: MemberService) {}

  @Get()
  @ApiOperation({ summary: 'List members of a class (paged, searchable).' })
  list(
    @Param('classId', new ParseUUIDPipe()) classId: string,
    @Query(new ZodValidationPipe(ListMembersQuerySchema)) query: ListMembersQueryDto,
  ) {
    return this.memberService.list(
      classId,
      { q: query.q, isActive: query.isActive },
      { page: query.page, limit: query.limit, total: 0 },
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add one or many members to a class.' })
  async add(
    @Param('classId', new ParseUUIDPipe()) classId: string,
    @Body(new ZodValidationPipe(AddMemberSchema)) body: AddMemberDto,
  ) {
    if ('members' in body) {
      return this.memberService.addBulk(classId, body.members);
    }
    const member = await this.memberService.addOne(classId, body);
    return { created: 1, items: [member] };
  }
}

@ApiTags('members')
@Controller('members')
export class MemberItemController {
  constructor(private readonly memberService: MemberService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a single member.' })
  getOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.memberService.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a member (name, phone, isActive).' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(UpdateMemberSchema)) body: UpdateMemberDto,
  ) {
    return this.memberService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a member (isActive=false).' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.memberService.setActive(id, false);
  }
}
