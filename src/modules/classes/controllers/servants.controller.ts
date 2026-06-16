import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { ClassTenantGuard } from '../../../common/guards/class-tenant.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AssignServantDto, AssignServantSchema } from '../dto/classes.dto';
import { ServantClassService } from '../services/servant-class.service';

@ApiTags('servants')
// Guard chain:
//   RolesGuard     — user.role must be SUPER_ADMIN or LEADER
//   ClassTenantGuard — caller must be leader/servant of the
//                       target class (SUPER_ADMIN short-circuits
//                       the role check, so the chain still
//                       lets them in)
// LEADER is intentionally restricted to the class they
// lead; the ClassTenantGuard rejects them for any other
// classId.
@UseGuards(RolesGuard, ClassTenantGuard)
@Roles('SUPER_ADMIN', 'LEADER')
@Controller('classes/:id/servants')
export class ServantsController {
  constructor(private readonly servantClassService: ServantClassService) {}

  @Get()
  @ApiOperation({ summary: 'List servants assigned to a class.' })
  list(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.servantClassService.list(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Assign one or many servants to a class. SUPER_ADMIN for any class; LEADER for their own class only.',
  })
  assign(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(AssignServantSchema)) body: AssignServantDto,
  ) {
    return this.servantClassService.assign(id, body.userIds);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Unassign a servant from a class. Same authorization as assign.',
  })
  async unassign(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<void> {
    await this.servantClassService.unassign(id, userId);
  }
}
