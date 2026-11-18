import { describe, expect, it } from 'vitest';
import { validateGrant } from '../src/lib/grantValidation';

describe('validateGrant award amount', () => {
  it('rejects a zero-dollar award before it reaches Firestore', () => {
    expect(validateGrant({ amount: 0 })).toBe('Award amount must be greater than $0.');
  });

  it('rejects a negative award amount', () => {
    expect(validateGrant({ amount: -1 })).toBe('Award amount must be a non-negative number.');
  });

  it('accepts a positive award amount', () => {
    expect(validateGrant({ amount: 1 })).toBeNull();
  });

  it('continues to allow zero spent amount', () => {
    expect(validateGrant({ spentAmount: 0 })).toBeNull();
  });
});
