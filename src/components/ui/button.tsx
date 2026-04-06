"use client";

import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
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
    primary: "bg-primary text-white hover:bg-primary-hover active:scale-95",
    secondary: "bg-surface-2 text-text border border-border hover:bg-border active:scale-95",
    danger: "bg-danger text-white hover:bg-red-600 active:scale-95",
    ghost: "text-text-muted hover:text-text hover:bg-surface-2 active:scale-95",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-5 py-3 text-base rounded-xl",
    lg: "px-6 py-4 text-lg rounded-xl min-h-[56px]",
  };

  return (
    <button
      className={cn(
        "font-semibold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
