"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, UserPlus, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

function InviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [state, setState] = useState<"loading" | "ready" | "accepting" | "success" | "error">("loading");
  const [invitation, setInvitation] = useState<{
    orgName: string;
    role: string;
    invitedBy: string;
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setError("No invitation token provided. Please check your invitation link.");
      return;
    }

    async function fetchInvitation() {
      try {
        const res = await api.get<{
          success: boolean;
          data: { orgName: string; role: string; invitedBy: string };
        }>(`/invitations/verify?token=${encodeURIComponent(token!)}`);
        setInvitation(res.data);
        setState("ready");
      } catch (err: unknown) {
        setState("error");
        const message = err instanceof Error ? err.message : "Unknown error";
        if (message.includes("expired")) {
          setError("This invitation has expired. Please ask the organization owner to send a new one.");
        } else if (message.includes("404") || message.includes("not found")) {
          setError("This invitation is invalid or has already been used.");
        } else {
          setError("Unable to verify invitation. The link may be invalid or expired.");
        }
      }
    }

    fetchInvitation();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setState("accepting");
    try {
      await api.post("/invitations/accept", { token });
      setState("success");
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch {
      setState("error");
      setError("Failed to accept the invitation. Please try again or contact the organization owner.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-white">
      <Card className="w-full max-w-md bg-white border-gray-200">
        {state === "loading" && (
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-coral-500 animate-spin mb-4" />
            <p className="text-sm text-gray-500">Verifying invitation...</p>
          </CardContent>
        )}

        {state === "ready" && invitation && (
          <>
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-coral-500/10">
                  <UserPlus className="h-8 w-8 text-coral-500" />
                </div>
              </div>
              <CardTitle className="text-xl text-gray-900">
                You&apos;ve been invited!
              </CardTitle>
              <CardDescription className="text-gray-500">
                You&apos;ve been invited to join an organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Organization</p>
                    <p className="text-sm font-medium text-gray-900">
                      {invitation.orgName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <UserPlus className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">Role</p>
                    <Badge className="bg-coral-500/10 text-coral-500 border-coral-500/30 capitalize">
                      {invitation.role}
                    </Badge>
                  </div>
                </div>
              </div>

              <Button
                className="w-full bg-coral-500 hover:bg-coral-600"
                onClick={handleAccept}
              >
                Accept Invitation
              </Button>
              <Button
                variant="ghost"
                className="w-full text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                onClick={() => router.push("/login")}
              >
                Decline
              </Button>
            </CardContent>
          </>
        )}

        {state === "accepting" && (
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 text-coral-500 animate-spin mb-4" />
            <p className="text-sm text-gray-500">Accepting invitation...</p>
          </CardContent>
        )}

        {state === "success" && (
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Welcome aboard!
            </h3>
            <p className="text-sm text-gray-500 text-center">
              Redirecting you to the dashboard...
            </p>
          </CardContent>
        )}

        {state === "error" && (
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 mb-4">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              Invalid Invitation
            </h3>
            <p className="text-sm text-gray-500 text-center max-w-sm mb-6">
              {error}
            </p>
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
              onClick={() => router.push("/login")}
            >
              Go to Login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          <Loader2 className="h-8 w-8 text-coral-500 animate-spin" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
