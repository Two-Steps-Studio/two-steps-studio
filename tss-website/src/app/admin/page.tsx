"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, Search, Users, Settings } from "lucide-react";

interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  xp: number;
  level: number;
  project_limit: number;
  subscription_plan: string;
  created_at: string;
}

export default function AdminPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [page, search, isAdmin]);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch("/api/admin/auth");
      const data = await response.json();
      setIsAdmin(data.isAdmin || false);
    } catch (error) {
      console.error("Failed to check admin status:", error);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
      });
      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserLimit = async (userId: string, newLimit: number) => {
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, project_limit: newLimit }),
      });
      fetchUsers();
    } catch (error) {
      console.error("Failed to update user limit:", error);
    }
  };

  const updateUserPlan = async (userId: string, newPlan: string) => {
    try {
      await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, subscription_plan: newPlan }),
      });
      fetchUsers();
    } catch (error) {
      console.error("Failed to update user plan:", error);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen  p-8">
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
    <div className="min-h-screen  p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8" />
            Admin Panel
          </h1>
          <p className="text-white/70">Manage user project limits and subscriptions</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 w-4 h-4" />
                <Input
                  placeholder="Search users by username..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-white/70">Loading users...</div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username || "User"}
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                          {(user.username || "U")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-white font-medium">{user.username || "Unknown User"}</div>
                        <div className="text-white/50 text-sm">
                          Level {user.level} • {user.xp} XP
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-white/50 text-xs mb-1">Project Limit</div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            value={user.project_limit}
                            onChange={(e) => updateUserLimit(user.id, parseInt(e.target.value) || 0)}
                            className="w-20 h-8 bg-white/10 border-white/20 text-white text-center"
                          />
                          <span className="text-white/70 text-sm">projects</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-white/50 text-xs mb-1">Plan</div>
                        <select
                          value={user.subscription_plan}
                          onChange={(e) => updateUserPlan(user.id, e.target.value)}
                          className="bg-white/10 border-white/20 text-white rounded px-3 py-1 text-sm"
                        >
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </div>

                      <Badge
                        variant={
                          user.subscription_plan === "enterprise"
                            ? "default"
                            : user.subscription_plan === "pro"
                            ? "secondary"
                            : "outline"
                        }
                        className={
                          user.subscription_plan === "enterprise"
                            ? "bg-purple-600"
                            : user.subscription_plan === "pro"
                            ? "bg-blue-600"
                            : "bg-gray-600"
                        }
                      >
                        {user.subscription_plan.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}

                {users.length === 0 && (
                  <div className="text-center py-8 text-white/50">No users found</div>
                )}
              </div>
            )}

            {total > 20 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Previous
                </Button>
                <span className="text-white/70 self-center">
                  Page {page} of {Math.ceil(total / 20)}
                </span>
                <Button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / 20)}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className="text-3xl font-bold text-white">{total}</div>
                <div className="text-white/50 text-sm">Total Users</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className="text-3xl font-bold text-white">
                  {users.filter((u) => u.subscription_plan === "free").length}
                </div>
                <div className="text-white/50 text-sm">Free Plans</div>
              </div>
              <div className="text-center p-4 bg-white/5 rounded-lg">
                <div className="text-3xl font-bold text-white">
                  {users.filter((u) => u.subscription_plan !== "free").length}
                </div>
                <div className="text-white/50 text-sm">Paid Plans</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
