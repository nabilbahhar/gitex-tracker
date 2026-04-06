import { cn } from "@/lib/utils";

const variants = {
  prospect: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  client: "bg-green-500/20 text-green-400 border-green-500/30",
  partenaire: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  autre: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  a_suivre: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  en_cours: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  termine: "bg-green-500/20 text-green-400 border-green-500/30",
  oui: "bg-green-500/20 text-green-400 border-green-500/30",
  non: "bg-red-500/20 text-red-400 border-red-500/30",
  peut_etre: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

export function Badge({
  variant,
  className,
  children,
}: {
  variant: keyof typeof variants;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variants[variant] || variants.autre,
        className
      )}
    >
      {children}
    </span>
  );
}
