"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import {Badge} from "@/components/ui/badge";

export default function RecruitmentPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    discord: "",
    position: "",
    experience: "",
    motivation: "",
    portfolio: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/dev/recruitment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to submit application");
      }

      toast.success("Application submitted successfully!");
      setFormData({
        name: "",
        email: "",
        discord: "",
        position: "",
        experience: "",
        motivation: "",
        portfolio: ""
      });
    } catch (error) {
      toast.error("Failed to submit application. Please try again.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
      <div className="container mx-auto p-6 mt-20 max-w-7xl">
        {/* Hero Section */}
        <div className="relative mb-16 md:aspect-video p-8 md:p-12 rounded-[2.5rem] overflow-hidden bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center">
          <img
              src="/assets/HeroSection/dev-recruitment.avif"
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-dev)]/20 via-transparent to-transparent opacity-50" />
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-[var(--color-dev)]/20 blur-3xl animate-pulse" />
      
          <div className="relative z-10 space-y-4 text-center">
            <Badge className="bg-[var(--color-dev)]/20 text-[var(--color-dev)] hover:bg-[var(--color-dev)]/30 border-0 px-4 py-1.5 text-sm font-medium rounded-full backdrop-blur-sm">
              Two Steps Studio
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-white font-[family-name:var(--font-space)] tracking-tight">
              <span className="text-[var(--color-dev)]">Dołącz do Two Steps Studio</span>
            </h1>
            <p className="text-white max-w-2xl mx-auto font-[family-name:var(--font-outfit)] text-lg md:text-xl leading-relaxed">
              Szukamy osób, które chcą tworzyć, eksperymentować i rozwijać własne pomysły razem z nami. Nie musisz wiedzieć wszystkiego - ważniejsza jest chęć nauki, zaangażowanie i gotowość do pracy nad prawdziwymi projektami.
            </p>
          </div>
        </div>
      
        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { name: "DEV", href: "/dev" },
            { name: "About Us", href: "/dev/about" },
          ].map((item, i) => (
              <a
                  key={i}
                  href={item.href}
                  className="rounded-3xl border border-[var(--color-dev)]/20 bg-[var(--color-dev)]/5 hover:bg-[var(--color-dev)]/10 transition-all p-5 shadow-sm group"
              >
                <div className="text-lg font-bold text-[var(--text)] group-hover:text-[var(--color-dev)] transition-colors">
                  {item.name}
                </div>
              </a>
          ))}
        </div>

        <p className="text-center text-[var(--text)] font-[family-name:var(--font-outfit)] text-lg max-w-2xl mx-auto">
          Odpowiedz na kilka pytań poniżej i opowiedz nam trochę o sobie i swoich umiejętnościach.
        </p>

        <Card className="max-w-2xl mx-auto p-6  bg-[var(--card-bg)]">
          <CardHeader>
            <CardTitle className="text-2xl">Join Our Team</CardTitle>
            <CardDescription>
              Apply to become part of Two Steps Studio development team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                />
              </div>
  
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="john@example.com"
                />
              </div>
  
              <div className="space-y-2">
                <Label htmlFor="discord">Discord Username</Label>
                <Input
                  id="discord"
                  name="discord"
                  value={formData.discord}
                  onChange={handleChange}
                  required
                  placeholder="john_example"
                />
              </div>
  
              <div className="space-y-2 ">
                <Label htmlFor="position">Position You're Applying For</Label>
                <Input
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                  placeholder="Frontend Developer, Backend Developer, Designer, etc."
                />
              </div>
  
              <div className="space-y-2">
                <Label htmlFor="experience">Experience</Label>
                <Textarea
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  required
                  placeholder="Tell us about your experience and skills..."
                  rows={4}
                />
              </div>
  
              <div className="space-y-2">
                <Label htmlFor="motivation">Motivation</Label>
                <Textarea
                  id="motivation"
                  name="motivation"
                  value={formData.motivation}
                  onChange={handleChange}
                  required
                  placeholder="Why do you want to join Two Steps Studio?"
                  rows={4}
                />
              </div>
  
              <div className="space-y-2">
                <Label htmlFor="portfolio">Portfolio/GitHub (Optional)</Label>
                <Input
                  id="portfolio"
                  name="portfolio"
                  value={formData.portfolio}
                  onChange={handleChange}
                  placeholder="https://github.com/username or portfolio link"
                />
              </div>
  
              <Button type="submit" className="w-full cursor-pointer" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Application
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
  );
}