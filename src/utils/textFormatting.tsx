import { ReactNode } from "react";

// Simple Helper to parse bold text e.g. **text** and `code` patterns
export function parseBold(text: string): ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="px-1.5 py-0.5 bg-watchguard-dark border border-watchguard-border rounded text-xs text-watchguard-orange font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}
