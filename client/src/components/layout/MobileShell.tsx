import { Link, useLocation } from "wouter";
import { Home, Dumbbell, History, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileShellProps {
  children: React.ReactNode;
}

export function MobileShell({ children }: MobileShellProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Today" },
    { href: "/plan", icon: Dumbbell, label: "Plan" },
    { href: "/history", icon: History, label: "History" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center bg-neutral-100 dark:bg-neutral-900">
      <div className="w-full max-w-md h-[100dvh] flex flex-col bg-background relative shadow-2xl overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto no-scrollbar scroll-smooth">
          {children}
          {/* Spacer for bottom nav */}
          <div className="h-24" /> 
        </main>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-0 left-0 right-0 border-t border-border bg-background/80 backdrop-blur-lg safe-pb z-50">
          <div className="flex justify-around items-center h-16">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              
              return (
                <Link key={item.href} href={item.href}>
                  <div className={cn(
                    "flex flex-col items-center justify-center w-16 h-full space-y-1 transition-colors duration-200 cursor-pointer",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}>
                    <Icon 
                      size={24} 
                      strokeWidth={isActive ? 2.5 : 2}
                      className={cn("transition-all", isActive && "scale-110")}
                    />
                    <span className="text-[10px] font-medium tracking-wide uppercase">{item.label}</span>
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
