"use client";

import { Header } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";
import { Inbox, MessageCircle } from "lucide-react";

export default function InboxPage() {
  return (
    <>
      <Header
        title="Inbox"
        description="Manage messages and comments from all platforms"
      />

      <div className="p-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-700 mb-4">
              <Inbox className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Unified Inbox Coming Soon</h3>
            <p className="text-sm text-slate-400 text-center max-w-md">
              The unified inbox will allow you to manage all your DMs and comments from TikTok and Instagram in one place.
            </p>
            <div className="flex items-center gap-2 mt-6 text-slate-500">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">This feature is part of Phase 5</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
