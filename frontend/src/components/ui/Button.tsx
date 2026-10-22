import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "emergency";

interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  loading?: boolean;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-[#0a84ff] text-white shadow-[0_10px_28px_-10px_rgba(10,132,255,0.8),inset_0_1px_0_rgba(255,255,255,0.28)] hover:bg-[#2f96ff]",
  secondary:
    "bg-white/10 text-slate-100 ring-1 ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl hover:bg-white/15",
  ghost: "text-slate-300 hover:bg-white/10 hover:text-white",
  danger: "bg-red-500/15 text-red-300 ring-1 ring-red-400/30 hover:bg-red-500/25",
  emergency:
    "bg-gradient-to-b from-[#ff6a5f] to-[#e8352b] text-white shadow-[0_12px_32px_-10px_rgba(255,69,58,0.85),inset_0_1px_0_rgba(255,255,255,0.32)] hover:from-[#ff7c72]",
};

export default function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <motion.button
      type={type}
      disabled={inactive}
      whileTap={inactive ? undefined : { scale: 0.96 }}
      whileHover={inactive ? undefined : { scale: 1.015 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`relative inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold tracking-tight transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </motion.button>
  );
}