import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

/**
 * Validates a request payload (body / query / params) against a Zod schema.
 *
 * On success, replaces the value with the parsed (and possibly transformed)
 * value, e.g. coerces string query params to numbers/dates.
 *
 * On failure, throws `BadRequestException` with a flattened error map
 * suitable for the `errors` field of our ProblemDetails body.
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: this.formatErrors(result.error),
      });
    }
    return result.data;
  }

  private formatErrors(error: ZodError): Record<string, string[]> {
    const flat = error.flatten();
    const fieldErrors: Record<string, string[]> = {};
    for (const [field, messages] of Object.entries(flat.fieldErrors)) {
      if (messages && messages.length > 0) {
        fieldErrors[field] = messages;
      }
    }
    for (const issue of error.issues) {
      if (issue.path.length === 0) {
        fieldErrors['_root'] = (fieldErrors['_root'] ?? []).concat(issue.message);
      }
    }
    return fieldErrors;
  }
}
