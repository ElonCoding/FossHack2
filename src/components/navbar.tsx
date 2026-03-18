"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

export function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          <span className="font-bold inline-block">DevEvent</span>
        </Link>
        <nav className="flex items-center space-x-4 text-sm font-medium">
          <Link href="/events" className="transition-colors hover:text-foreground/80 text-foreground/60">
            Events
          </Link>
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground/60">
                Dashboard
              </Link>
              <div className="flex items-center space-x-4">
                <span className="text-muted-foreground hidden sm:inline-block">
                  {user?.name}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
