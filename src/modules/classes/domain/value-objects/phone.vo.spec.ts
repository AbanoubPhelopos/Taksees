import { Phone } from './phone.vo';

describe('Phone value object', () => {
  describe('E.164 normalisation', () => {
    it.each([
      ['+201234567890', '+201234567890'],
      ['01234567890', '+201234567890'],
      ['00201234567890', '+201234567890'],
      ['  +20 123 456 7890  ', '+201234567890'],
      ['+1-555-123-4567', '+15551234567'],
    ])('normalises %s to %s', (input, expected) => {
      expect(Phone.parse(input).value).toBe(expected);
    });

    it('respects a custom default country code', () => {
      expect(Phone.parse('0612345678', '+33').value).toBe('+33612345678');
    });

    it('preserves the leading + if present', () => {
      expect(Phone.parse('+33612345678').value).toBe('+33612345678');
    });
  });

  describe('rejection', () => {
    it.each([
      '',
      '   ',
      'abc',
      '+',
      '+0123456', // leading zero after country code
      '+20123', // too short
      '+2012345678901234567', // too long (>15 digits)
    ])('rejects %s', (input) => {
      expect(() => Phone.parse(input)).toThrow();
    });

    it('rejects null/undefined', () => {
      // @ts-expect-error — testing runtime guard
      expect(() => Phone.parse(null)).toThrow();
      // @ts-expect-error — testing runtime guard
      expect(() => Phone.parse(undefined)).toThrow();
    });
  });

  describe('equality', () => {
    it('two Phones with the same value are equal', () => {
      const a = Phone.parse('+201234567890');
      const b = Phone.parse('01234567890');
      expect(a.equals(b)).toBe(true);
    });

    it('null/undefined is not equal', () => {
      const a = Phone.parse('+201234567890');
      expect(a.equals(null)).toBe(false);
      expect(a.equals(undefined)).toBe(false);
    });
  });
});
