import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export function PageHeader({ title, description, actions, showBack }: { title: string; description?: string; actions?: ReactNode; showBack?: boolean }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div className="flex items-start gap-3 min-w-0">
        {showBack && (
          <button 
            onClick={() => window.history.back()}
            className="mt-1 p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
            title="Go Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight truncate">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
