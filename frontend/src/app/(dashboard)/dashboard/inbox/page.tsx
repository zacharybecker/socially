"use client";

import { useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Inbox,
  MessageCircle,
  MessageSquare,
  Mail,
  LinkIcon,
  ArrowRight,
} from "lucide-react";

export default function InboxPage() {
  const [activeTab, setActiveTab] = useState("all");

  return (
    <>
      <Header
        title="Inbox"
        description="Manage messages and comments from all platforms"
      />

      <div className="p-6 space-y-6">
        {/* Coming Soon Banner */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20">
              <Inbox className="h-6 w-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-white">
                  Unified Inbox
                </h2>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  Coming Soon
                </Badge>
              </div>
              <p className="text-sm text-slate-400">
                Manage all your DMs, comments, and mentions from every connected
                platform in one place.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs Card */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b border-slate-700 px-4 pt-4">
                <TabsList className="bg-transparent gap-2">
                  <TabsTrigger
                    value="all"
                    className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="comments"
                    className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Comments
                  </TabsTrigger>
                  <TabsTrigger
                    value="messages"
                    className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Messages
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="all" className="mt-0">
                <EmptyState
                  icon={<Mail className="h-8 w-8 text-slate-500" />}
                  title="No messages yet"
                  description="When you connect your social accounts, all your DMs, comments, and mentions will appear here."
                />
              </TabsContent>

              <TabsContent value="comments" className="mt-0">
                <EmptyState
                  icon={<MessageSquare className="h-8 w-8 text-slate-500" />}
                  title="No comments yet"
                  description="Comments from your posts across all platforms will show up here for easy management."
                />
              </TabsContent>

              <TabsContent value="messages" className="mt-0">
                <EmptyState
                  icon={<MessageCircle className="h-8 w-8 text-slate-500" />}
                  title="No messages yet"
                  description="Direct messages from your connected social accounts will be unified here."
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
                <LinkIcon className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">
                  Connect accounts to start receiving messages
                </h3>
                <p className="text-xs text-slate-400">
                  Link your social media accounts to manage conversations from
                  one place.
                </p>
              </div>
            </div>
            <Button
              className="bg-gradient-to-r from-blue-500 to-purple-600 gap-2"
              onClick={() =>
                (window.location.href = "/dashboard/accounts")
              }
            >
              Connect Accounts
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700/50 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-medium text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400 text-center max-w-sm">
        {description}
      </p>
    </div>
  );
}
