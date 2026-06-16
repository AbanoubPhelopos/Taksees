import { ZodValidationPipe } from './zod-validation.pipe';
import { z } from 'zod';
import { BadRequestException } from '@nestjs/common';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    name: z.string().min(2).max(50),
    age: z.coerce.number().int().min(0).max(150),
    email: z.string().email(),
  });

  const pipe = new ZodValidationPipe(schema);

  it('returns parsed data on success', () => {
    const input = { name: 'Mariam', age: '7', email: 'mariam@example.com' };
    const result = pipe.transform(input, { type: 'body' });
    expect(result).toEqual({ name: 'Mariam', age: 7, email: 'mariam@example.com' });
  });

  it('throws BadRequestException with field errors on failure', () => {
    const input = { name: 'M', age: -5, email: 'not-an-email' };
    try {
      pipe.transform(input, { type: 'body' });
      fail('expected to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(BadRequestException);
      const body = (err as BadRequestException).getResponse() as {
        errors: Record<string, string[]>;
      };
      expect(body.errors).toBeDefined();
      expect(body.errors.name).toBeDefined();
      expect(body.errors.age).toBeDefined();
      expect(body.errors.email).toBeDefined();
    }
  });

  it('returns the same data when nothing to transform', () => {
    const input = { name: 'Mariam', age: 7, email: 'mariam@example.com' };
    const result = pipe.transform(input, { type: 'query' });
    expect(result).toEqual(input);
  });
});
