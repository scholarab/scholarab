import { useEffect, useRef } from 'react';

interface Props {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function AnimatedNumber({ value, prefix = '', suffix = '', className, style }: Props) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const prevRef = useRef<number>(value);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prevStr = String(prevRef.current);
    const nextStr = String(value);
    prevRef.current = value;

    // Pad to same length
    const maxLen = Math.max(prevStr.length, nextStr.length);
    const prev = prevStr.padStart(maxLen, ' ');
    const next = nextStr.padStart(maxLen, ' ');

    const digitEls = container.querySelectorAll<HTMLSpanElement>('.an-digit');

    // If digit count changed, re-render all
    if (digitEls.length !== maxLen) {
      container.innerHTML = '';
      for (let i = 0; i < maxLen; i++) {
        const span = document.createElement('span');
        span.className = 'an-digit';
        span.style.cssText = 'display:inline-block;overflow:hidden;line-height:inherit;vertical-align:bottom;';
        const inner = document.createElement('span');
        inner.style.cssText = 'display:inline-block;';
        inner.textContent = next[i] === ' ' ? '' : next[i];
        span.appendChild(inner);
        container.appendChild(span);
      }
      return;
    }

    // Animate only changed digits
    digitEls.forEach((span, i) => {
      const inner = span.querySelector('span')!;
      const prevChar = prev[i] === ' ' ? '' : prev[i];
      const nextChar = next[i] === ' ' ? '' : next[i];
      if (prevChar === nextChar) return;

      const goUp = Number(nextChar) > Number(prevChar);
      inner.animate(
        [
          { transform: `translateY(${goUp ? '100%' : '-100%'})`, opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 },
        ],
        { duration: 220, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'forwards' }
      );
      inner.textContent = nextChar;
    });
  }, [value]);

  // Initial render
  const digits = String(value).split('');

  return (
    <span className={className} style={style}>
      {prefix}
      <span ref={containerRef} style={{ display: 'inline-flex', alignItems: 'flex-end' }}>
        {digits.map((d, i) => (
          <span key={i} className="an-digit" style={{ display: 'inline-block', overflow: 'hidden', lineHeight: 'inherit', verticalAlign: 'bottom' }}>
            <span style={{ display: 'inline-block' }}>{d}</span>
          </span>
        ))}
      </span>
      {suffix}
    </span>
  );
}
