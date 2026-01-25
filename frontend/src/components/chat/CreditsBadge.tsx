import { Coins } from "lucide-react";

interface CreditsBadgeProps {
  remaining: number;
  total?: number;
  isLoading?: boolean;
}

export function CreditsBadge({
  remaining,
  total,
  isLoading,
}: CreditsBadgeProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted">
        <Coins className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted">
      <Coins className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">
        {remaining}
        {total !== undefined && ` / ${total}`}
      </span>
      <span className="text-sm text-muted-foreground">credits</span>
    </div>
  );
}
