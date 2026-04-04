import { Link, useLocation } from "@/lib/router";
import { Home, BarChart3, Settings, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileShellProps {
  children: React.ReactNode;
}

export function MobileShell({ children }: MobileShellProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Today" },
    { href: "/plan", icon: Dumbbell, label: "Plan" },
    { href: "/history", icon: BarChart3, label: "Progress" },
    { href: "/profile", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="min-h-screen text-foreground flex justify-center app-shell">
      <div className="w-full max-w-md h-[100dvh] flex flex-col relative overflow-hidden app-panel safe-px shadow-2xl ring-1 ring-white/10 border border-border/60 sm:rounded-[30px]">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth safe-pt">
          {children}
          {/* Spacer for bottom nav */}
          <div className="h-28" /> 
        </main>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 border-t border-border/60 bg-background/78 backdrop-blur-xl safe-px safe-pb z-50">
          <div className="grid h-[4.5rem] grid-cols-4 gap-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "mt-1 flex h-14 flex-col items-center justify-center rounded-2xl space-y-1 transition-all duration-200 cursor-pointer",
                    isActive
                      ? "bg-primary/12 text-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/35"
                  )}>
                    <Icon 
                      size={21} 
                      strokeWidth={isActive ? 2.5 : 2}
                      className={cn("transition-all", isActive && "scale-110")}
                    />
                    <span className="text-[10px] font-semibold tracking-[0.18em] uppercase">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
