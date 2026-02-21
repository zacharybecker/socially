"use client";

import { useState, useRef } from "react";
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

export default function SettingsPage() {
  const { userProfile, updateUserProfile, resetPassword } = useAuth();
  const { currentOrganization, updateOrganization } = useOrganization();

  const [displayName, setDisplayName] = useState(userProfile?.displayName || "");
  const [orgName, setOrgName] = useState(currentOrganization?.name || "");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <>
      <Header
        title="Settings"
        description="Manage your account and organization settings"
      />

      <div className="p-6">
        <Tabs defaultValue="profile">
          <TabsList className="bg-slate-800 border-slate-700 mb-6">
            <TabsTrigger value="profile" className="data-[state=active]:bg-slate-700 text-slate-300 gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="organization" className="data-[state=active]:bg-slate-700 text-slate-300 gap-2">
              <Building2 className="h-4 w-4" />
              Organization
            </TabsTrigger>
            <TabsTrigger value="billing" className="data-[state=active]:bg-slate-700 text-slate-300 gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-slate-700 text-slate-300 gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="brand-voice" className="data-[state=active]:bg-slate-700 text-slate-300 gap-2">
              <Sparkles className="h-4 w-4" />
              Brand Voice
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Profile Information</CardTitle>
                  <CardDescription className="text-slate-400">
                    Update your personal details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={userProfile?.photoURL || undefined} />
                      <AvatarFallback className="bg-slate-700 text-white text-xl">
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
                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change Photo
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200">Display Name</Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-slate-700/50 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-200">Email</Label>
                    <Input
                      value={userProfile?.email || ""}
                      disabled
                      className="bg-slate-700/50 border-slate-600 text-slate-400"
                    />
                    <p className="text-xs text-slate-500">Email cannot be changed</p>
                  </div>

                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="bg-gradient-to-r from-blue-500 to-purple-600"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Security</CardTitle>
                  <CardDescription className="text-slate-400">
                    Manage your account security
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/50">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-white">Password</p>
                        <p className="text-xs text-slate-400">Last changed: Never</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700"
                      onClick={handleChangePassword}
                    >
                      Change
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/50">
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-white">Two-Factor Auth</p>
                        <p className="text-xs text-slate-400">Not available yet</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700" disabled>
                      Enable
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Organization Settings</CardTitle>
                <CardDescription className="text-slate-400">
                  Manage your organization details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-slate-200">Organization Name</Label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="bg-slate-700/50 border-slate-600 text-white max-w-md"
                  />
                </div>

                <Button
                  onClick={handleSaveOrganization}
                  disabled={saving || !currentOrganization}
                  className="bg-gradient-to-r from-blue-500 to-purple-600"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>

                <Separator className="bg-slate-700" />

                <div>
                  <h4 className="text-sm font-medium text-white mb-4">Team Members</h4>
                  <p className="text-sm text-slate-400 mb-4">
                    Team management is available on Business and Agency plans.
                  </p>
                  <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700" disabled>
                    Invite Team Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Current Plan</CardTitle>
                  <CardDescription className="text-slate-400">
                    You are currently on the Free plan
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/50 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">Free</h3>
                        <Badge className="bg-slate-600">Current</Badge>
                      </div>
                      <p className="text-2xl font-bold text-white mt-1">$0<span className="text-sm font-normal text-slate-400">/month</span></p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {planFeatures.free.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-slate-300">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Upgrade Your Plan</CardTitle>
                  <CardDescription className="text-slate-400">
                    Get more features with a paid plan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: "Creator", price: "$15", features: planFeatures.creator },
                    { name: "Business", price: "$49", features: planFeatures.business },
                    { name: "Agency", price: "$149", features: planFeatures.agency },
                  ].map((plan) => (
                    <div
                      key={plan.name}
                      className="p-4 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{plan.name}</h4>
                        <span className="text-white font-bold">{plan.price}<span className="text-sm font-normal text-slate-400">/mo</span></span>
                      </div>
                      <ul className="space-y-1">
                        {plan.features.slice(0, 2).map((feature, index) => (
                          <li key={index} className="text-xs text-slate-400">
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <Button
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600"
                    onClick={() => toast.info("Billing coming soon")}
                  >
                    Upgrade Now
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Notification Preferences</CardTitle>
                <CardDescription className="text-slate-400">
                  Choose how you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Notification settings coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Brand Voice Tab */}
          <TabsContent value="brand-voice">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-400" />
                  Brand Voice
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Define your brand&apos;s voice to generate consistent AI content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Guidelines */}
                <div className="space-y-2">
                  <Label className="text-slate-200">Brand Guidelines</Label>
                  <textarea
                    value={brandGuidelines}
                    onChange={(e) => setBrandGuidelines(e.target.value)}
                    placeholder="Describe your brand's voice, personality, and communication style..."
                    rows={4}
                    className="w-full rounded-md bg-slate-700/50 border border-slate-600 text-white placeholder:text-slate-500 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Tone */}
                <div className="space-y-2">
                  <Label className="text-slate-200">Tone</Label>
                  <Input
                    value={brandTone}
                    onChange={(e) => setBrandTone(e.target.value)}
                    placeholder="e.g., Professional yet approachable, witty, authoritative"
                    className="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>

                {/* Key Phrases */}
                <div className="space-y-2">
                  <Label className="text-slate-200">Key Phrases</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {keyPhrases.map((phrase, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-400 border border-blue-500/30"
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
                      className="bg-slate-700/50 border-slate-600 text-white"
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
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 shrink-0"
                      onClick={() => addTag(newKeyPhrase, setNewKeyPhrase, keyPhrases, setKeyPhrases)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Avoid Phrases */}
                <div className="space-y-2">
                  <Label className="text-slate-200">Avoid Phrases</Label>
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
                      className="bg-slate-700/50 border-slate-600 text-white"
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
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 shrink-0"
                      onClick={() => addTag(newAvoidPhrase, setNewAvoidPhrase, avoidPhrases, setAvoidPhrases)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Sample Content */}
                <div className="space-y-2">
                  <Label className="text-slate-200">Sample Content</Label>
                  <p className="text-xs text-slate-500">
                    Add examples of content that represents your brand voice
                  </p>
                  <div className="space-y-2 mb-2">
                    {sampleContent.map((sample, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 rounded-lg bg-slate-700/30 border border-slate-700 p-3"
                      >
                        <p className="text-sm text-slate-300 flex-1">{sample}</p>
                        <button
                          onClick={() => removeTag(i, sampleContent, setSampleContent)}
                          className="text-slate-500 hover:text-slate-300 shrink-0 mt-0.5"
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
                      className="bg-slate-700/50 border-slate-600 text-white"
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
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 shrink-0"
                      onClick={() => addTag(newSample, setNewSample, sampleContent, setSampleContent)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator className="bg-slate-700" />

                <Button
                  onClick={handleSaveBrandVoice}
                  disabled={savingBrandVoice || !currentOrganization}
                  className="bg-gradient-to-r from-blue-500 to-purple-600"
                >
                  {savingBrandVoice ? "Saving..." : "Save Brand Voice"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
