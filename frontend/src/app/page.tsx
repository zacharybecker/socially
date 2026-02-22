"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, BarChart3, Calendar, Sparkles, Users, Zap } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-coral-500" />
      </div>
    );
  }

  const features = [
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description: "Schedule posts across TikTok and Instagram from one dashboard",
    },
    {
      icon: Sparkles,
      title: "AI Content Generation",
      description: "Generate hooks, captions, and scripts with AI assistance",
    },
    {
      icon: BarChart3,
      title: "Analytics & Insights",
      description: "Track performance and get AI-powered recommendations",
    },
    {
      icon: Users,
      title: "Multi-Account Support",
      description: "Manage multiple accounts and brands in one place",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-coral-500">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-gray-900">Social Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" className="text-gray-700 hover:text-gray-900">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-coral-500 hover:bg-coral-600">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 text-gray-700 text-sm mb-8">
            <Zap className="h-4 w-4 text-yellow-400" />
            Powered by AI
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Manage All Your Social Media
            <br />
            <span className="text-coral-500">
              In One Place
            </span>
          </h1>
          <p className="text-xl text-gray-500 mb-8 max-w-2xl mx-auto">
            Schedule posts, generate AI content, and track analytics across TikTok and Instagram.
            Everything you need to grow your social presence.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-coral-500 hover:bg-coral-600">
              <Link href="/register">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Our all-in-one platform gives you the tools to create, schedule, and analyze your content effectively.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-coral-500/10 mb-4">
                  <feature.icon className="h-6 w-6 text-coral-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="rounded-2xl bg-coral-500 p-12 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to Grow Your Social Media?
            </h2>
            <p className="text-white/80 mb-8 max-w-xl mx-auto">
              Join thousands of creators and businesses who use Social Manager to streamline their content strategy.
            </p>
            <Button asChild size="lg" className="bg-white text-gray-900 hover:bg-gray-100">
              <Link href="/register">
                Get Started for Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-coral-500">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm text-gray-500">Social Manager</span>
          </div>
          <p className="text-sm text-gray-500">
            2024 Social Manager. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
