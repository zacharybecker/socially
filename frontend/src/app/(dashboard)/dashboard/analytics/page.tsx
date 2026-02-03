"use client";

import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, Eye, Heart, MessageCircle, Share2, TrendingUp, Users } from "lucide-react";
import { useState } from "react";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30d");

  const stats = [
    { name: "Total Views", value: "0", icon: Eye, change: "+0%", color: "text-blue-400" },
    { name: "Total Likes", value: "0", icon: Heart, change: "+0%", color: "text-red-400" },
    { name: "Comments", value: "0", icon: MessageCircle, change: "+0%", color: "text-yellow-400" },
    { name: "Shares", value: "0", icon: Share2, change: "+0%", color: "text-green-400" },
    { name: "Followers", value: "0", icon: Users, change: "+0%", color: "text-purple-400" },
    { name: "Engagement Rate", value: "0%", icon: TrendingUp, change: "+0%", color: "text-orange-400" },
  ];

  return (
    <>
      <Header
        title="Analytics"
        description="Track your performance across all platforms"
        actions={
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="7d" className="text-white focus:bg-slate-700">Last 7 days</SelectItem>
              <SelectItem value="30d" className="text-white focus:bg-slate-700">Last 30 days</SelectItem>
              <SelectItem value="90d" className="text-white focus:bg-slate-700">Last 90 days</SelectItem>
              <SelectItem value="1y" className="text-white focus:bg-slate-700">Last year</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {stats.map((stat) => (
            <Card key={stat.name} className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  <span className="text-xs text-green-500">{stat.change}</span>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-400">{stat.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <Tabs defaultValue="overview">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700 text-slate-300">
              Overview
            </TabsTrigger>
            <TabsTrigger value="posts" className="data-[state=active]:bg-slate-700 text-slate-300">
              Posts
            </TabsTrigger>
            <TabsTrigger value="audience" className="data-[state=active]:bg-slate-700 text-slate-300">
              Audience
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Engagement Over Time */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Engagement Over Time</CardTitle>
                  <CardDescription className="text-slate-400">
                    Views, likes, and comments trend
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-16">
                    <BarChart3 className="h-16 w-16 text-slate-600 mb-4" />
                    <p className="text-sm text-slate-400">No data available</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Connect accounts and publish posts to see analytics
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Follower Growth */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Follower Growth</CardTitle>
                  <CardDescription className="text-slate-400">
                    New followers over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-16">
                    <Users className="h-16 w-16 text-slate-600 mb-4" />
                    <p className="text-sm text-slate-400">No data available</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Connect accounts to track follower growth
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Top Performing Posts</CardTitle>
                <CardDescription className="text-slate-400">
                  Your best content by engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-16">
                  <TrendingUp className="h-16 w-16 text-slate-600 mb-4" />
                  <p className="text-sm text-slate-400">No posts to analyze</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Publish posts to see performance data
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audience" className="mt-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Audience Demographics</CardTitle>
                <CardDescription className="text-slate-400">
                  Who is engaging with your content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-16">
                  <Users className="h-16 w-16 text-slate-600 mb-4" />
                  <p className="text-sm text-slate-400">No audience data available</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Connect accounts to see audience insights
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
