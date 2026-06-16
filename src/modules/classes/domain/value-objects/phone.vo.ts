import { InvalidPhoneError } from './phone.error';

/**
 * E.164 phone number value object.
 *
 * Normalises input to a canonical E.164 form:
 *   - strips whitespace, dashes, parentheses
 *   - prepends the configured default country code if missing
 *   - validates the final shape: +<country><subscriber>, 7–15 digits
 *
 * Equality is by the normalised string.
 */
export class Phone {
  /** E.164 number, e.g. "+201234567890". */
  public readonly value: string;

  private static readonly E164_REGEX = /^\+[1-9]\d{6,14}$/;

  private constructor(value: string) {
    this.value = value;
  }

  static parse(input: string, defaultCountryCode = '+20'): Phone {
    if (typeof input !== 'string' || input.trim().length === 0) {
      throw new InvalidPhoneError(String(input));
    }

    // Strip common formatting characters.
    let digits = input.replace(/[\s\-().]/g, '');

    // If the input has a leading "00" (international prefix), replace with "+".
    if (digits.startsWith('00')) {
      digits = '+' + digits.slice(2);
    }

    // If still no "+", this is a local number. Prepend the default
    // country code and strip the local trunk prefix (a leading "0").
    if (!digits.startsWith('+')) {
      digits = defaultCountryCode + digits.replace(/^0+/, '');
    }

    if (!Phone.E164_REGEX.test(digits)) {
      throw new InvalidPhoneError(input);
    }

    return new Phone(digits);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Phone | null | undefined): boolean {
    return !!other && this.value === other.value;
  }
}
