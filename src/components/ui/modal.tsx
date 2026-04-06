"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={cn(
          "relative w-full sm:max-w-lg bg-surface border border-border rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto",
          className
        )}
      >
        <div className="sticky top-0 bg-surface border-b border-border px-5 py-4 flex items-center justify-between rounded-t-3xl sm:rounded-t-2xl z-10">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-2 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
