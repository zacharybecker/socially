"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import Link from "next/link";
import { Post } from "@/types";

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [posts, setPosts] = useState<Post[]>([]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the start with empty days to align with week
  const startDay = monthStart.getDay();
  const paddedDays = [...Array(startDay).fill(null), ...days];

  const getPostsForDay = (date: Date) => {
    return posts.filter(
      (post) =>
        post.scheduledAt &&
        format(new Date(post.scheduledAt), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    );
  };

  return (
    <>
      <Header
        title="Content Calendar"
        description="Plan and visualize your content schedule"
        actions={
          <Button asChild className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            <Link href="/dashboard/posts/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Link>
          </Button>
        }
      />

      <div className="p-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                {format(currentMonth, "MMMM yyyy")}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentMonth(new Date())}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-px mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-slate-400 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-slate-700 rounded-lg overflow-hidden">
              {paddedDays.map((day, index) => {
                if (!day) {
                  return (
                    <div
                      key={`empty-${index}`}
                      className="min-h-24 bg-slate-800/50 p-2"
                    />
                  );
                }

                const dayPosts = getPostsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isCurrentDay = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-24 bg-slate-800 p-2 ${
                      !isCurrentMonth ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-sm font-medium ${
                          isCurrentDay
                            ? "flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white"
                            : "text-slate-300"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      {isCurrentMonth && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100"
                          asChild
                        >
                          <Link href={`/dashboard/posts/new?date=${format(day, "yyyy-MM-dd")}`}>
                            <Plus className="h-3 w-3" />
                          </Link>
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayPosts.slice(0, 2).map((post) => (
                        <Link
                          key={post.id}
                          href={`/dashboard/posts/${post.id}`}
                          className="block"
                        >
                          <Badge
                            className={`w-full justify-start truncate text-xs ${
                              post.status === "published"
                                ? "bg-green-600/20 text-green-400"
                                : post.status === "scheduled"
                                ? "bg-blue-600/20 text-blue-400"
                                : "bg-slate-600/20 text-slate-400"
                            }`}
                          >
                            {post.content?.slice(0, 20) || "No caption"}
                          </Badge>
                        </Link>
                      ))}
                      {dayPosts.length > 2 && (
                        <span className="text-xs text-slate-500">
                          +{dayPosts.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
