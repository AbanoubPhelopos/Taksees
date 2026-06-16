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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
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

  // Listing classes is an authenticated but not class-scoped
  // endpoint — no ClassTenantGuard here, just Better Auth.
  @Get()
  @ApiOperation({ summary: 'List classes (paged, filterable by level/leader).' })
  list(@Query(new ZodValidationPipe(ListClassesQuerySchema)) query: ListClassesQueryDto) {
    return this.classService.list(
      { level: query.level, leaderId: query.leaderId },
      { page: query.page, limit: query.limit, total: 0 },
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a class. LEADER or SUPER_ADMIN only.' })
  create(@Body(new ZodValidationPipe(CreateClassSchema)) body: CreateClassDto) {
    return this.classService.create(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a class by id.' })
  getOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.classService.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a class. LEADER of class or SUPER_ADMIN only.' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(UpdateClassSchema)) body: UpdateClassDto,
  ) {
    return this.classService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a class. SUPER_ADMIN only.' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.classService.delete(id);
  }
}
