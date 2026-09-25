"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, UserPlus, Check, X, Mail, MessageSquare, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Application {
  id: string;
  source: "recruitment" | "dev_recruitment";
  type: "dev" | "discord_admin";
  name: string;
  email: string;
  discord: string;
  position: string;
  experience: string;
  motivation: string;
  portfolio: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

const STATUS_FILTERS = ["pending", "accepted", "rejected", "all"] as const;
const STATUS_LABEL: Record<Application["status"], string> = {
  pending: "Oczekujące",
  accepted: "Zaakceptowane",
  rejected: "Odrzucone",
};
const STATUS_COLOR: Record<Application["status"], string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  accepted: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function AdminRecruitmentPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkedAdmin, setCheckedAdmin] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("pending");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/admin/auth");
        const data = await response.json();
        setIsAdmin(data.isAdmin || false);
      } catch (error) {
        console.error("Failed to check admin status:", error);
      } finally {
        setCheckedAdmin(true);
      }
    })();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = filter === "all" ? "" : `?status=${filter}`;
      const response = await fetch(`/api/admin/recruitment${params}`);
      const data = await response.json();
      setApplications(data.applications || []);
    } catch (error) {
      console.error("Failed to fetch applications:", error);
      toast.error("Nie udało się załadować zgłoszeń.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, filter]);

  const handleStatusChange = async (id: string, status: "accepted" | "rejected") => {
    setUpdatingId(id);
    try {
      const response = await fetch("/api/admin/recruitment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok) throw new Error("update failed");
      toast.success(status === "accepted" ? "Zgłoszenie zaakceptowane." : "Zgłoszenie odrzucone.");
      setApplications((prev) =>
        filter === "all"
          ? prev.map((a) => (a.id === id ? { ...a, status } : a))
          // Leaving this status filter's list now that it no longer matches.
          : prev.filter((a) => a.id !== id)
      );
    } catch (error) {
      console.error("Failed to update application:", error);
      toast.error("Nie udało się zaktualizować statusu.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (checkedAdmin && !isAdmin) {
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[var(--text)] mb-2 flex items-center gap-3">
            <UserPlus className="w-8 h-8" />
            Rekrutacja
          </h1>
          <p className="text-[var(--text-muted)]">Zgłoszenia z /recruitment i /dev/recruitment.</p>
        </div>

        <div className="flex gap-2 mb-6">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className="rounded-full capitalize"
            >
              {f === "all" ? "Wszystkie" : STATUS_LABEL[f]}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-8 text-[var(--text-muted)]">Ładowanie...</div>
        ) : applications.length === 0 ? (
          <Card className="bg-[var(--card-bg)] border-[var(--border-color)]">
            <CardContent className="p-12 text-center text-[var(--text-muted)]">
              Brak zgłoszeń w tej kategorii.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <Card key={app.id} className="bg-[var(--card-bg)] border-[var(--border-color)]">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <CardTitle className="text-lg text-[var(--text)]">{app.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {app.position} · {app.source === "dev_recruitment" ? "Dev" : app.type === "discord_admin" ? "Administracja Discord" : "Dev"} ·{" "}
                        {new Date(app.created_at).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" })}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={STATUS_COLOR[app.status]}>
                      {STATUS_LABEL[app.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-4 text-sm text-[var(--text-muted)]">
                    <a href={`mailto:${app.email}`} className="flex items-center gap-1.5 hover:text-[var(--text)]">
                      <Mail size={14} /> {app.email}
                    </a>
                    <span className="flex items-center gap-1.5">
                      <MessageSquare size={14} /> {app.discord}
                    </span>
                    {app.portfolio && (
                      <a href={app.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[var(--text)]">
                        <ExternalLink size={14} /> Portfolio
                      </a>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Doświadczenie</p>
                    <p className="text-sm text-[var(--text)] whitespace-pre-line">{app.experience}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--text-muted)] uppercase mb-1">Motywacja</p>
                    <p className="text-sm text-[var(--text)] whitespace-pre-line">{app.motivation}</p>
                  </div>
                  {app.status === "pending" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        disabled={updatingId === app.id}
                        onClick={() => handleStatusChange(app.id, "accepted")}
                        className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                      >
                        <Check size={14} /> Akceptuj
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingId === app.id}
                        onClick={() => handleStatusChange(app.id, "rejected")}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1.5"
                      >
                        <X size={14} /> Odrzuć
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
