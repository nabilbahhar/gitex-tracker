"use client";

import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary:
      "bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow active:scale-[0.98]",
    secondary:
      "bg-surface-2 text-text border border-border hover:border-border-strong hover:bg-surface-3 active:scale-[0.98]",
    outline:
      "bg-transparent text-text border border-border hover:bg-surface-2 active:scale-[0.98]",
    danger:
      "bg-danger text-white hover:opacity-90 shadow-sm active:scale-[0.98]",
    ghost:
      "text-text-muted hover:text-text hover:bg-surface-2 active:scale-[0.98]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-4 py-2.5 text-sm rounded-xl",
    lg: "px-5 py-3.5 text-base rounded-xl min-h-[52px]",
  };

  return (
    <button
      className={cn(
        "font-medium transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 tracking-tight",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
