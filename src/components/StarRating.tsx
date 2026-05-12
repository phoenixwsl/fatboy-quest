interface Props {
  value: number;       // 0-5
  onChange?: (v: number) => void;
  size?: number;
  readonly?: boolean;
  color?: string;
}

export function StarRating({ value, onChange, size = 32, readonly = false, color = '#fbbf24' }: Props) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(n)}
            className="active:scale-90 transition-transform"
            style={{ width: size, height: size }}
          >
            <svg viewBox="0 0 24 24" width={size} height={size}>
              <path
                d="M12 2 L14.4 8.6 L21.5 9.2 L16.2 13.8 L17.7 20.7 L12 16.9 L6.3 20.7 L7.8 13.8 L2.5 9.2 L9.6 8.6 Z"
                fill={filled ? color : 'none'}
                stroke={filled ? color : '#71717a'}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
