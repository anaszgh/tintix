import { UserGuide } from "@/components/guide/user-guide";

interface HeaderProps {
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-card-foreground">{title}</h2>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div data-help-trigger>
            <UserGuide />
          </div>
          {actions && (
            <>
              {actions}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
