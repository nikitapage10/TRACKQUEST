export function PixelButton({
  children,
  onClick,
  variant = 'mint',
  className = '',
  disabled,
  type = 'button',
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'mint' | 'pink' | 'ghost' | 'gold';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  style?: React.CSSProperties;
}) {
  const v = variant === 'mint' ? '' : variant;
  return (
    <button
      type={type}
      className={`pxbtn ${v} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}
