import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dices, DoorOpen, LogOut, Menu, Users, type LucideIcon } from "lucide-react";
import { useTRPC } from "../lib/trpc";
import { supabase } from "../lib/supabase";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "./ui/sheet";
import { Toaster } from "./ui/sonner";
import { cn } from "../lib/utils";

const navItems = [
  { to: "/characters", label: "Characters", icon: Users },
  { to: "/rooms", label: "Rooms", icon: DoorOpen },
] as const;

function NavLink({
  to,
  label,
  icon: Icon,
  active,
  onClick,
}: {
  to: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors min-h-[44px]",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isSignInPage = pathname === "/sign-in";
  const [mobileOpen, setMobileOpen] = useState(false);

  const trpc = useTRPC();
  const authQuery = useQuery({
    ...trpc.auth.me.queryOptions(),
    enabled: !isSignInPage,
  });

  const userData = authQuery.data ?? null;
  const displayName = userData?.displayName ?? userData?.email ?? null;
  const avatarUrl = userData?.avatarUrl ?? null;

  async function handleSignOut() {
    await supabase.auth.signOut();
    await queryClient.invalidateQueries({ queryKey: trpc.auth.me.queryKey() });
    navigate({ to: "/sign-in" });
  }

  if (isSignInPage) {
    return (
      <>
        {children}
        <Toaster />
      </>
    );
  }

  const initials = displayName ? (displayName[0]?.toUpperCase() ?? "?") : "?";
  const isActive = (to: string) => pathname === to || pathname.startsWith(`${to}/`);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex md:w-60 md:flex-col md:shrink-0 border-r border-border bg-card">
        <div className="flex items-center gap-2 px-6 h-16 border-b border-border">
          <Dices className="h-6 w-6 text-primary" />
          <span className="font-semibold text-foreground">DnD Weekend</span>
        </div>
        <div className="flex-1 p-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                active={isActive(item.to)}
              />
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 min-h-[44px]">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={avatarUrl ?? undefined} alt={displayName ?? "User"} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="truncate text-sm">{displayName ?? "User"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="min-h-[44px] text-destructive">
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center justify-between h-16 px-4 border-b border-border bg-card md:hidden">
          <div className="flex items-center gap-2">
            <Dices className="h-6 w-6 text-primary" />
            <span className="font-semibold text-foreground">DnD Weekend</span>
          </div>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex items-center gap-2 px-4 h-16 border-b border-border">
                <Dices className="h-6 w-6 text-primary" />
                <span className="font-semibold text-foreground">DnD Weekend</span>
              </div>
              <div className="p-4">
                <nav className="flex flex-col gap-1">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      label={item.label}
                      icon={item.icon}
                      active={isActive(item.to)}
                      onClick={() => setMobileOpen(false)}
                    />
                  ))}
                </nav>
              </div>
              <div className="mt-auto p-4 border-t border-border">
                <div className="flex items-center gap-2 px-3 py-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatarUrl ?? undefined} alt={displayName ?? "User"} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm">{displayName ?? "User"}</span>
                </div>
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="w-full justify-start gap-2 min-h-[44px] mt-1 text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-2xl">{children}</div>
        </main>
      </div>

      <Toaster />
    </div>
  );
}
