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
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { AssignServantDto, AssignServantSchema } from '../dto/classes.dto';
import { ServantClassService } from '../services/servant-class.service';

@ApiTags('servants')
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
  @ApiOperation({ summary: 'Assign one or many servants to a class.' })
  assign(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(AssignServantSchema)) body: AssignServantDto,
  ) {
    return this.servantClassService.assign(id, body.userIds);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unassign a servant from a class.' })
  async unassign(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ): Promise<void> {
    await this.servantClassService.unassign(id, userId);
  }
}
