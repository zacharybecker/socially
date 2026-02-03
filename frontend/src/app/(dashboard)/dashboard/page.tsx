"use client";

import { Header } from "@/components/dashboard/header";
import { useOrganization } from "@/lib/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  Eye,
  Heart,
  MessageCircle,
  Plus,
  Share2,
  TrendingUp,
  Users,
} from "lucide-react";

export default function DashboardPage() {
  const { currentOrganization } = useOrganization();

  const stats = [
    { name: "Total Posts", value: "0", icon: Calendar, change: "+0%", changeType: "neutral" },
    { name: "Total Views", value: "0", icon: Eye, change: "+0%", changeType: "neutral" },
    { name: "Engagement", value: "0%", icon: Heart, change: "+0%", changeType: "neutral" },
    { name: "Followers", value: "0", icon: Users, change: "+0%", changeType: "neutral" },
  ];

  return (
    <>
      <Header
        title="Dashboard"
        description={currentOrganization ? `Welcome to ${currentOrganization.name}` : "Welcome back"}
      />

      <div className="p-6 space-y-6">
        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button asChild className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            <Link href="/dashboard/posts/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Link>
          </Button>
          <Button asChild variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
            <Link href="/dashboard/accounts">
              <Users className="mr-2 h-4 w-4" />
              Connect Account
            </Link>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.name} className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">
                  {stat.name}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-slate-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-slate-400">
                  <span
                    className={
                      stat.changeType === "positive"
                        ? "text-green-500"
                        : stat.changeType === "negative"
                        ? "text-red-500"
                        : "text-slate-500"
                    }
                  >
                    {stat.change}
                  </span>{" "}
                  from last month
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Posts */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Posts</CardTitle>
              <CardDescription className="text-slate-400">
                Your latest scheduled and published posts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-12 w-12 text-slate-600 mb-4" />
                <p className="text-sm text-slate-400 mb-4">No posts yet</p>
                <Button asChild size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <Link href="/dashboard/posts/new">Create your first post</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Connected Accounts */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Connected Accounts</CardTitle>
              <CardDescription className="text-slate-400">
                Manage your social media accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-12 w-12 text-slate-600 mb-4" />
                <p className="text-sm text-slate-400 mb-4">No accounts connected</p>
                <Button asChild size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                  <Link href="/dashboard/accounts">Connect an account</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Analytics */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Performance Overview</CardTitle>
              <CardDescription className="text-slate-400">
                Engagement metrics for the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="h-12 w-12 text-slate-600 mb-4" />
                <p className="text-sm text-slate-400 mb-4">No data available yet</p>
                <p className="text-xs text-slate-500">
                  Analytics will appear once you start posting
                </p>
              </div>
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">AI Suggestions</CardTitle>
              <CardDescription className="text-slate-400">
                Personalized recommendations to improve your content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/50">
                  <TrendingUp className="h-5 w-5 text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">Connect your accounts</p>
                    <p className="text-xs text-slate-400">
                      Link your TikTok or Instagram to start scheduling posts
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/50">
                  <MessageCircle className="h-5 w-5 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">Try AI content generation</p>
                    <p className="text-xs text-slate-400">
                      Generate hooks, captions, and scripts with AI
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-700/50">
                  <Share2 className="h-5 w-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-white">Schedule your first post</p>
                    <p className="text-xs text-slate-400">
                      Plan your content calendar for consistent posting
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
