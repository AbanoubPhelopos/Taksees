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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ClassTenantGuard } from '../../../common/guards/class-tenant.guard';
import {
  CreateClassDto,
  CreateClassSchema,
  ListClassesQueryDto,
  ListClassesQuerySchema,
  UpdateClassDto,
  UpdateClassSchema,
} from '../dto/classes.dto';
import { ClassService } from '../services/class.service';

@ApiTags('classes')
@ApiBearerAuth()
@Controller('classes')
export class ClassesController {
  constructor(private readonly classService: ClassService) {}

  // GET / is the only class-collection endpoint that doesn't
  // need an explicit @Roles: any authenticated user can list
  // classes (the PWA's "pick a class" screen depends on this).
  // Per-class endpoints below add the @Roles guard.
  @Get()
  @ApiOperation({ summary: 'List classes (paged, filterable by level/leader).' })
  list(@Query(new ZodValidationPipe(ListClassesQuerySchema)) query: ListClassesQueryDto) {
    return this.classService.list(
      { level: query.level, leaderId: query.leaderId },
      { page: query.page, limit: query.limit, total: 0 },
    );
  }

  // POST: SUPER_ADMIN only. Creating a class implies
  // appointing its leader, which is a structural decision.
  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a class. SUPER_ADMIN only.' })
  create(@Body(new ZodValidationPipe(CreateClassSchema)) body: CreateClassDto) {
    return this.classService.create(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a class by id.' })
  getOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.classService.getById(id);
  }

  // PATCH: SUPER_ADMIN for any class, OR the leader of this
  // specific class. The combined RolesGuard + ClassTenantGuard
  // chain is what enforces that "leader of this specific class"
  // rule (ClassTenantGuard accepts the leader of the X-Class-Id
  // target; RolesGuard accepts SUPER_ADMIN or LEADER).
  @Patch(':id')
  @UseGuards(RolesGuard, ClassTenantGuard)
  @Roles('SUPER_ADMIN', 'LEADER')
  @ApiOperation({
    summary: 'Update a class. SUPER_ADMIN, or the LEADER of this class.',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(UpdateClassSchema)) body: UpdateClassDto,
  ) {
    return this.classService.update(id, body);
  }

  // DELETE: SUPER_ADMIN only. Deleting a class cascades to
  // members, sessions, quizzes — this is a destructive
  // operation and only the top role can do it.
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a class. SUPER_ADMIN only.' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.classService.delete(id);
  }
}
