"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Mountain } from "lucide-react";
import Link from "next/link";
import { ModeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";

export function Header() {
  const [mounted, setMounted] = React.useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = React.useCallback(async () => {
    await signOut();
    router.push("/signin");
  }, [router, signOut]);

  return (
    <header className="flex h-16 w-full items-center justify-between border-b px-4 md:px-6">
      <Link className="flex items-center gap-2" href="/">
        <Mountain className="h-6 w-6" />
        <span className="font-semibold">Event Platform</span>
      </Link>
      <div className="hidden items-center gap-6 md:flex">
        <Link className="font-medium" href="/">
          Home
        </Link>
        <Link className="font-medium" href="/events">
          Events
        </Link>
        {user && (
          <Link className="font-medium" href="/dashboard">
            Dashboard
          </Link>
        )}
        {user && <span className="text-sm text-muted-foreground">{user.email}</span>}
      </div>
      <div className="hidden items-center gap-4 md:flex">
        <ModeToggle />
        {!user ? (
          <>
            <Button size="sm" variant="outline" asChild>
              <Link href="/signin">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        )}
      </div>
      {mounted && (
        <Sheet>
          <SheetTrigger asChild>
            <Button className="md:hidden" size="icon" variant="outline">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <div className="grid gap-4 p-4">
              <Link className="font-medium" href="/">
                Home
              </Link>
              <Link className="font-medium" href="/events">
                Events
              </Link>
              <div className="grid gap-4">
                {!user ? (
                  <>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/signin">Sign In</Link>
                    </Button>
                    <Button size="sm" asChild>
                      <Link href="/signup">Sign Up</Link>
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={handleLogout}>
                    Logout
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </header>
  );
}
