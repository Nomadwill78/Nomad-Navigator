import React, { useEffect, useRef, useState } from 'react';
import { formatMoney, parseMoney } from '../src/lib/money';

interface Props {
  /** The saved amount. */
  value: number | undefined;
  /** Called with a valid amount (rounded to cents), or undefined when cleared and `allowEmpty` is set. */
  onCommit: (value: number | undefined) => void;
  allowEmpty?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

const plain = (v: number | undefined) => (v === undefined ? '' : String(v));

/**
 * A dollars-and-cents box. It keeps exactly what the person typed while they type, so "47000.25"
 * is never reinterpreted halfway through, and only saves values that are valid. Anything invalid
 * (text, more than 2 decimals, negative, over the limit) shows a message and is NOT saved.
 */
export const MoneyInput: React.FC<Props> = ({ value, onCommit, allowEmpty, disabled, placeholder, className, ariaLabel }) => {
  const [text, setText] = useState(plain(value));
  const [error, setError] = useState<string | null>(null);
  const focused = useRef(false);

  // Follow the saved value (another person's edit, a reload) unless the person is mid-typing.
  useEffect(() => {
    if (!focused.current) {
      setText(plain(value));
      setError(null);
    }
  }, [value]);

  const handleChange = (raw: string) => {
    setText(raw);
    if (raw.trim() === '') {
      if (allowEmpty) { setError(null); onCommit(undefined); }
      else setError('Enter an amount, or 0.');
      return;
    }
    const parsed = parseMoney(raw);
    if ('value' in parsed) { setError(null); onCommit(parsed.value); }
    else setError(parsed.reason);
  };

  return (
    <span className="inline-flex flex-col gap-1 min-w-0">
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={error ? true : undefined}
        value={text}
        onFocus={() => { focused.current = true; }}
        onBlur={() => {
          focused.current = false;
          // Settle on the saved value, so a rejected entry does not linger as if it had saved.
          setText(plain(value));
          setError(null);
        }}
        onChange={(e) => handleChange(e.target.value)}
        className={className}
      />
      {error && <span role="alert" className="text-[11px] text-alert leading-tight">{error}</span>}
    </span>
  );
};

export { formatMoney };
