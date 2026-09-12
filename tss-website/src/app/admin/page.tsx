"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Bot, Gamepad2 } from "lucide-react";
import Link from "next/link";

// Used to be a full user-management panel (project_limit/subscription_plan
// editing) for a "dev projects" feature that turned out to have no
// surviving UI anywhere else in the site (no page ever linked to
// /dev/projects) and has since been removed entirely. What's left of this
// page is just what it always also was: the only entry point to the two
// still-real admin panels below, since neither has any other nav path.
export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/admin/auth")
      .then((res) => res.json())
      .then((data) => setIsAdmin(!!data.isAdmin))
      .catch(() => setIsAdmin(false))
      .finally(() => setChecked(true));
  }, []);

  if (!checked) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen p-8">
        <Card className="max-w-md mx-auto mt-20 bg-[var(--card-bg)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Admin Access
            </CardTitle>
            <CardDescription>
              You don't have admin privileges. Contact the system administrator.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[var(--text)] mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8" />
            Admin Panel
          </h1>
          <p className="text-[var(--text-muted)]">Wybierz panel do zarządzania.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link href="/admin/bot">
            <Card className="bg-[var(--card-bg)] border-[var(--border-color)] hover:bg-[var(--bg)] transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[var(--text)]">
                  <Bot className="w-5 h-5" /> Sterowanie botem
                </CardTitle>
                <CardDescription>Ustawienia, userzy, logi, giveaway i tickety Discord bota.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/admin/games">
            <Card className="bg-[var(--card-bg)] border-[var(--border-color)] hover:bg-[var(--bg)] transition-colors cursor-pointer h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-[var(--text)]">
                  <Gamepad2 className="w-5 h-5" /> Gry
                </CardTitle>
                <CardDescription>Zarządzanie wydaniami gier.</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
