"use client";

import { useState, useRef, useEffect } from "react";
import { Header } from "@/components/dashboard/header";
import { useAuth, useOrganization } from "@/lib/hooks";
import { api, endpoints } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building2, CreditCard, Bell, Shield, Sparkles, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { UpgradeDialog } from "@/components/billing/upgrade-dialog";
import { PlanTier } from "@/types";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  const { userProfile, updateUserProfile, resetPassword } = useAuth();
  const { currentOrganization, updateOrganization, createOrganization, organizations } = useOrganization();

  const [displayName, setDisplayName] = useState(userProfile?.displayName || "");
  const [orgName, setOrgName] = useState(currentOrganization?.name || "");
  const [saving, setSaving] = useState(false);
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync orgName when currentOrganization changes
  useEffect(() => {
    setOrgName(currentOrganization?.name || "");
  }, [currentOrganization]);

  // Brand Voice state
  const [brandGuidelines, setBrandGuidelines] = useState("");
  const [brandTone, setBrandTone] = useState("");
  const [keyPhrases, setKeyPhrases] = useState<string[]>([]);
  const [avoidPhrases, setAvoidPhrases] = useState<string[]>([]);
  const [sampleContent, setSampleContent] = useState<string[]>([]);
  const [newKeyPhrase, setNewKeyPhrase] = useState("");
  const [newAvoidPhrase, setNewAvoidPhrase] = useState("");
  const [newSample, setNewSample] = useState("");
  const [savingBrandVoice, setSavingBrandVoice] = useState(false);

  // Billing state
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<PlanTier | null>(null);
  const currentPlan = userProfile?.planTier || "free";
  const currentPlanLabel = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);

  // Notification settings (persisted to localStorage)
  const [notificationSettings, setNotificationSettings] = useState(() => {
    const defaults = {
      postPublished: true,
      postFailed: true,
      approvalNeeded: true,
      approvalResult: true,
      memberJoined: false,
      weeklyDigest: true,
    };
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("notificationSettings");
        if (saved) return { ...defaults, ...JSON.parse(saved) };
      } catch {
        // Ignore corrupted localStorage
      }
    }
    return defaults;
  });

  const updateNotificationSetting = (key: string, value: boolean) => {
    setNotificationSettings((prev: Record<string, boolean>) => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem("notificationSettings", JSON.stringify(updated));
      return updated;
    });
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateUserProfile(displayName);
      toast.success("Profile updated");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) return;
    setCreatingOrg(true);
    try {
      await createOrganization(newOrgName.trim());
      setNewOrgName("");
      toast.success("Organization created");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to create organization");
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleSaveOrganization = async () => {
    if (!currentOrganization) return;
    setSaving(true);
    try {
      await updateOrganization(currentOrganization.id, orgName);
      toast.success("Organization updated");
    } catch (error) {
      toast.error("Failed to update organization");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentOrganization?.id) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<{ success: boolean; data: { url: string } }>(
        endpoints.media.upload(currentOrganization.id),
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      await updateUserProfile(displayName || userProfile?.displayName || "", res.data.url);
      toast.success("Photo updated");
    } catch (error) {
      toast.error("Failed to upload photo");
    }
  };

  const handleChangePassword = async () => {
    if (!userProfile?.email) return;
    try {
      await resetPassword(userProfile.email);
      toast.success("Password reset email sent");
    } catch (error) {
      toast.error("Failed to send reset email");
    }
  };

  const handleSaveBrandVoice = async () => {
    if (!currentOrganization) return;
    setSavingBrandVoice(true);
    try {
      await api.put(endpoints.brandVoice.update(currentOrganization.id), {
        guidelines: brandGuidelines,
        tone: brandTone,
        keyPhrases,
        avoidPhrases,
        sampleContent,
      });
      toast.success("Brand voice settings saved");
    } catch (error) {
      toast.error("Failed to save brand voice settings");
    } finally {
      setSavingBrandVoice(false);
    }
  };

  const addTag = (
    value: string,
    setter: (val: string) => void,
    list: string[],
    listSetter: (val: string[]) => void
  ) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      listSetter([...list, trimmed]);
    }
    setter("");
  };

  const removeTag = (index: number, list: string[], listSetter: (val: string[]) => void) => {
    listSetter(list.filter((_, i) => i !== index));
  };

  const planFeatures: Record<string, string[]> = {
    free: ["1 social account", "10 posts/month", "Basic analytics"],
    creator: ["5 social accounts", "Unlimited posts", "AI content generation", "Advanced analytics"],
    business: ["15 social accounts", "Team collaboration (3 users)", "Priority support"],
    agency: ["Unlimited accounts", "Unlimited team members", "White-label options", "API access"],
  };

  const planPrices: Record<string, string> = {
    free: "$0",
    creator: "$15",
    business: "$49",
    agency: "$149",
  };

  return (
    <>
      <Header
        title="Settings"
        description="Manage your account and organization settings"
      />

      <div className="p-6">
        <Tabs defaultValue="profile">
          <TabsList className="bg-gray-50 border-gray-200 mb-6">
            <TabsTrigger value="profile" className="data-[state=active]:bg-gray-200 text-gray-700 gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="organization" className="data-[state=active]:bg-gray-200 text-gray-700 gap-2">
              <Building2 className="h-4 w-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="billing" className="data-[state=active]:bg-gray-200 text-gray-700 gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-gray-200 text-gray-700 gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="brand-voice" className="data-[state=active]:bg-gray-200 text-gray-700 gap-2">
              <Sparkles className="h-4 w-4" />
              Brand Voice
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900">Profile Information</CardTitle>
                  <CardDescription className="text-gray-500">
                    Update your personal details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={userProfile?.photoURL || undefined} />
                      <AvatarFallback className="bg-gray-200 text-gray-900 text-xl">
                        {userProfile?.displayName?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleChangePhoto}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-300 text-gray-700 hover:bg-gray-200"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change Photo
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-800">Display Name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-gray-100 border-gray-300 text-gray-900"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-800">Email</Label>
                    <Input
                      value={userProfile?.email || ""}
                      disabled
                      className="bg-gray-100 border-gray-300 text-gray-500"
                    />
                    <p className="text-xs text-gray-400">Email cannot be changed</p>
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="bg-coral-500 hover:bg-coral-600"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900">Security</CardTitle>
                  <CardDescription className="text-gray-500">
                    Manage your account security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-100">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Password</p>
                        <p className="text-xs text-gray-500">Last changed: Never</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300 text-gray-700 hover:bg-gray-200"
                      onClick={handleChangePassword}
                    >
                      Change
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-100">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Two-Factor Auth</p>
                        <p className="text-xs text-gray-500">Adds an extra layer of security. This feature is planned for a future release.</p>
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-300">Planned</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization">
            {!currentOrganization ? (
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900">Create Your Organization</CardTitle>
                  <CardDescription className="text-gray-500">
                    Get started by creating your first organization
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-gray-800">Organization Name</Label>
                    <Input
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="Enter your organization name"
                      className="bg-gray-100 border-gray-300 text-gray-900 max-w-md"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateOrganization();
                        }
                      }}
                    />
                  </div>

                  <Button
                    onClick={handleCreateOrganization}
                    disabled={creatingOrg || !newOrgName.trim()}
                    className="bg-coral-500 hover:bg-coral-600"
                  >
                    {creatingOrg ? "Creating..." : "Create Organization"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900">Organization Settings</CardTitle>
                  <CardDescription className="text-gray-500">
                    Manage your organization details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-gray-800">Organization Name</Label>
                    <Input
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="bg-gray-100 border-gray-300 text-gray-900 max-w-md"
                    />
                  </div>

                  <Button
                    onClick={handleSaveOrganization}
                    disabled={saving || !currentOrganization}
                    className="bg-coral-500 hover:bg-coral-600"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>

                  <Separator className="bg-gray-200" />

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-4">Team Members</h4>
                    <p className="text-sm text-gray-500 mb-4">
                      Team management is available on Business and Agency plans.
                    </p>
                    <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-200" disabled>
                      Invite Team Member
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900">Current Plan</CardTitle>
                  <CardDescription className="text-gray-500">
                    You are currently on the {currentPlanLabel} plan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-gray-100 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">{currentPlanLabel}</h3>
                        <Badge className="bg-gray-300">Current</Badge>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{planPrices[currentPlan]}<span className="text-sm font-normal text-gray-500">/month</span></p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {planFeatures[currentPlan].map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="h-1.5 w-1.5 rounded-full bg-coral-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                  <CardTitle className="text-gray-900">Upgrade Your Plan</CardTitle>
                  <CardDescription className="text-gray-500">
                    Get more features with a paid plan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: "Creator", price: "$15", features: planFeatures.creator },
                    { name: "Business", price: "$49", features: planFeatures.business },
                    { name: "Agency", price: "$149", features: planFeatures.agency },
                  ].filter((plan) => plan.name.toLowerCase() !== currentPlan).map((plan) => (
                    <div
                      key={plan.name}
                      className="p-4 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                      onClick={() => {
                        setTargetPlan(plan.name.toLowerCase() as PlanTier);
                        setUpgradeDialogOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{plan.name}</h4>
                        <span className="text-gray-900 font-bold">{plan.price}<span className="text-sm font-normal text-gray-500">/mo</span></span>
                      </div>
                      <ul className="space-y-1">
                        {plan.features.slice(0, 2).map((feature, index) => (
                          <li key={index} className="text-xs text-gray-500">
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <Button
                    className="w-full bg-coral-500 hover:bg-coral-600"
                    onClick={() => {
                      setTargetPlan("creator");
                      setUpgradeDialogOpen(true);
                    }}
                  >
                    Upgrade Now
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900">Notification Preferences</CardTitle>
                <CardDescription className="text-gray-500">
                  Choose how you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { key: "postPublished", label: "Post Published", description: "Get notified when a post is successfully published" },
                  { key: "postFailed", label: "Post Failed", description: "Get notified when a post fails to publish" },
                  { key: "approvalNeeded", label: "Approval Needed", description: "Get notified when a post is submitted for your approval" },
                  { key: "approvalResult", label: "Approval Result", description: "Get notified when your post is approved or rejected" },
                  { key: "memberJoined", label: "Member Joined", description: "Get notified when a new member joins your organization" },
                  { key: "weeklyDigest", label: "Weekly Digest", description: "Receive a weekly summary of your social media performance" },
                ].map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-gray-900">{setting.label}</Label>
                      <p className="text-xs text-gray-500">{setting.description}</p>
                    </div>
                    <Switch
                      checked={notificationSettings[setting.key]}
                      onCheckedChange={(checked) => updateNotificationSetting(setting.key, checked)}
                    />
                  </div>
                ))}
                <p className="text-xs text-gray-400">
                  Notification delivery will be available in a future update. Your preferences are saved locally.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Brand Voice Tab */}
          <TabsContent value="brand-voice">
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-coral-500" />
                  Brand Voice
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Define your brand&apos;s voice to generate consistent AI content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Guidelines */}
                <div className="space-y-2">
                  <Label className="text-gray-800">Brand Guidelines</Label>
                  <textarea
                    value={brandGuidelines}
                    onChange={(e) => setBrandGuidelines(e.target.value)}
                    placeholder="Describe your brand's voice, personality, and communication style..."
                    rows={4}
                    className="w-full rounded-md bg-gray-100 border border-gray-300 text-gray-900 placeholder:text-gray-400 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-coral-500"
                  />
                </div>

                {/* Tone */}
                <div className="space-y-2">
                  <Label className="text-gray-800">Tone</Label>
                  <Input
                    value={brandTone}
                    onChange={(e) => setBrandTone(e.target.value)}
                    placeholder="e.g., Professional yet approachable, witty, authoritative"
                    className="bg-gray-100 border-gray-300 text-gray-900"
                  />
                </div>

                {/* Key Phrases */}
                <div className="space-y-2">
                  <Label className="text-gray-800">Key Phrases</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {keyPhrases.map((phrase, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-coral-500/10 px-3 py-1 text-xs text-coral-500 border border-coral-500/30"
                      >
                        {phrase}
                        <button onClick={() => removeTag(i, keyPhrases, setKeyPhrases)}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newKeyPhrase}
                      onChange={(e) => setNewKeyPhrase(e.target.value)}
                      placeholder="Add a key phrase..."
                      className="bg-gray-100 border-gray-300 text-gray-900"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(newKeyPhrase, setNewKeyPhrase, keyPhrases, setKeyPhrases);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-gray-300 text-gray-700 hover:bg-gray-200 shrink-0"
                      onClick={() => addTag(newKeyPhrase, setNewKeyPhrase, keyPhrases, setKeyPhrases)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Avoid Phrases */}
                <div className="space-y-2">
                  <Label className="text-gray-800">Avoid Phrases</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {avoidPhrases.map((phrase, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-xs text-red-400 border border-red-500/30"
                      >
                        {phrase}
                        <button onClick={() => removeTag(i, avoidPhrases, setAvoidPhrases)}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newAvoidPhrase}
                      onChange={(e) => setNewAvoidPhrase(e.target.value)}
                      placeholder="Add a phrase to avoid..."
                      className="bg-gray-100 border-gray-300 text-gray-900"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(newAvoidPhrase, setNewAvoidPhrase, avoidPhrases, setAvoidPhrases);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-gray-300 text-gray-700 hover:bg-gray-200 shrink-0"
                      onClick={() => addTag(newAvoidPhrase, setNewAvoidPhrase, avoidPhrases, setAvoidPhrases)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Sample Content */}
                <div className="space-y-2">
                  <Label className="text-gray-800">Sample Content</Label>
                  <p className="text-xs text-gray-400">
                    Add examples of content that represents your brand voice
                  </p>
                  <div className="space-y-2 mb-2">
                    {sampleContent.map((sample, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-lg bg-gray-50 border border-gray-200 p-3"
                      >
                        <p className="text-sm text-gray-700 flex-1">{sample}</p>
                        <button
                          onClick={() => removeTag(i, sampleContent, setSampleContent)}
                          className="text-gray-400 hover:text-gray-700 shrink-0 mt-0.5"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newSample}
                      onChange={(e) => setNewSample(e.target.value)}
                      placeholder="Paste sample content..."
                      className="bg-gray-100 border-gray-300 text-gray-900"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(newSample, setNewSample, sampleContent, setSampleContent);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="border-gray-300 text-gray-700 hover:bg-gray-200 shrink-0"
                      onClick={() => addTag(newSample, setNewSample, sampleContent, setSampleContent)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator className="bg-gray-200" />

                <Button
                  onClick={handleSaveBrandVoice}
                  disabled={savingBrandVoice || !currentOrganization}
                  className="bg-coral-500 hover:bg-coral-600"
                >
                  {savingBrandVoice ? "Saving..." : "Save Brand Voice"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <UpgradeDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        targetPlan={targetPlan}
      />
    </>
  );
}
