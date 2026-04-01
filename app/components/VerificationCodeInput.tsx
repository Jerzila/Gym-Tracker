"use client";

import { useEffect, useMemo, useRef } from "react";

type Props = {
  length?: number;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
};

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function VerificationCodeInput({ length = 6, value, onChange, disabled }: Props) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = useMemo(() => {
    const cleaned = onlyDigits(value).slice(0, length);
    return Array.from({ length }, (_, i) => cleaned[i] ?? "");
  }, [length, value]);

  useEffect(() => {
    inputsRef.current = inputsRef.current.slice(0, length);
  }, [length]);

  const setDigit = (index: number, digit: string) => {
    const nextDigits = digits.slice();
    nextDigits[index] = digit;
    onChange(nextDigits.join("").slice(0, length));
  };

  const handlePaste = (index: number, text: string) => {
    const pasted = onlyDigits(text).slice(0, length);
    if (!pasted) return;

    const nextDigits = digits.slice();
    for (let i = 0; i < length; i++) {
      nextDigits[i] = pasted[i] ?? "";
    }
    onChange(nextDigits.join(""));

    const lastFilled = Math.min(pasted.length, length) - 1;
    const focusIndex = Math.max(0, Math.min(length - 1, lastFilled));
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          aria-label={`Verification code digit ${index + 1}`}
          value={digit}
          disabled={disabled}
          onPaste={(e) => {
            e.preventDefault();
            handlePaste(index, e.clipboardData.getData("text"));
          }}
          onChange={(e) => {
            const next = onlyDigits(e.target.value);
            if (!next) {
              setDigit(index, "");
              return;
            }

            const one = next.slice(-1);
            setDigit(index, one);
            if (index < length - 1) {
              inputsRef.current[index + 1]?.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace") {
              if (digits[index]) {
                setDigit(index, "");
                return;
              }
              if (index > 0) {
                inputsRef.current[index - 1]?.focus();
                setDigit(index - 1, "");
              }
            }
            if (e.key === "ArrowLeft" && index > 0) inputsRef.current[index - 1]?.focus();
            if (e.key === "ArrowRight" && index < length - 1) inputsRef.current[index + 1]?.focus();
          }}
          className="h-12 w-11 rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-center text-lg font-semibold tracking-widest text-zinc-100 shadow-[0_10px_30px_rgba(0,0,0,0.35)] focus:border-[rgba(255,170,0,0.6)] focus:outline-none focus:ring-0 disabled:opacity-60"
        />
      ))}
    </div>
  );
}

