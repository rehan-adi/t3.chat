import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  authApi,
  creditApi,
  CreditInfo,
  ApiKeyInfo,
  apiKeysApi,
  settingsApi,
  AccountSettings,
} from "@/lib/api";
import {
  ArrowLeft,
  Monitor,
  Sun,
  Moon,
  User,
  History,
  Key,
  Settings as SettingsIcon,
  Command,
  ArrowBigUp,
  Delete,
} from "lucide-react";

type SettingsTab = "account" | "customization" | "history" | "api-keys";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [account, setAccount] = useState<AccountSettings | null>(null);
  const [credits, setCredits] = useState<CreditInfo | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const cycleTheme = () => {
    if (theme === "system") setTheme("light");
    else if (theme === "light") setTheme("dark");
    else setTheme("system");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountData, creditsData] = await Promise.all([
          settingsApi.getAccount(),
          creditApi.getCredits(),
        ]);
        setAccount(accountData);
        setCredits({
          remaining: creditsData.remaining,
          total: accountData.isPremium ? 250 : 5,
        });
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "api-keys") {
      const fetchApiKeys = async () => {
        try {
          const data = await apiKeysApi.get();
          setApiKeys(data);
        } catch (err) {
          console.error("Failed to load API keys:", err);
        }
      };
      fetchApiKeys();
    }
  }, [activeTab]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } catch (err) {
      navigate("/signin");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const totalCredits = account.isPremium ? 250 : 5;
  const remainingCredits = credits.remaining;
  const usedCredits = totalCredits - remainingCredits;

  const usagePercentage =
    totalCredits > 0 ? (usedCredits / totalCredits) * 100 : 0;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col justify-start px-32">
      <header className="px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Chat
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative group">
            <button
              onClick={cycleTheme}
              className="h-9 w-9 flex items-center justify-center rounded-md 
               hover:bg-accent transition-colors"
            >
              {theme === "system" && <Monitor className="h-4 w-4" />}
              {theme === "light" && <Sun className="h-4 w-4" />}
              {theme === "dark" && <Moon className="h-4 w-4" />}
            </button>

            <div
              className="absolute top-full left-1/2 -translate-x-1/2 mt-2
             px-2 py-1 text-xs rounded bg-black text-[#D4C7E1] bg-popover
             opacity-0 group-hover:opacity-100 
             transform translate-y-1 group-hover:translate-y-0
             transition-all duration-200 ease-out
             pointer-events-none whitespace-nowrap"
            >
              Theme
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="px-3 py-2 text-sm font-medium rounded-md
             hover:bg-accent transition-colors
             disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? "Signing out..." : "Sign Out"}
          </button>
        </div>
      </header>

      <div className="flex gap-10">
        <div className="w-[355px] p-6 space-y-6">
          <div className="flex flex-col items-center gap-4 pb-6">
            <div className="w-40 h-40 rounded-full bg-[#A2014D] flex items-center justify-center text-white font-semibold">
              {account?.name?.[0]?.toUpperCase() ||
                account?.email?.[0]?.toUpperCase() ||
                "U"}
            </div>
            <div className="flex flex-col justify-center items-center min-w-0">
              <h2 className="font-semibold text-2xl mb-1 truncate">
                {account?.name || "User"}
              </h2>
              <p className="text-md text-[#E7D0DD] truncate">
                {account?.email}
              </p>
              <p className="text-xs border text-white rounded-full max-w-40 px-3 py-0.5 font-medium mt-1">
                {account?.isPremium ? "Premium" : "Free"} Plan
              </p>
            </div>
          </div>

          <div className="space-y-3 p-4 bg-black rounded-lg">
            <div>
              <h3 className="text-sm font-medium mb-6">Message Usage</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#F9F8FB]">Standard</span>
                <span className="font-medium text-[#E7D0DD]">
                  {usedCredits}/{totalCredits} used
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-[#A2014D] h-2 rounded-full transition-all"
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
              <p className="text-sm text-[#E7D0DD]">
                {remainingCredits} messages remaining
              </p>
            </div>
            <p className="text-xs text-[#E7D0DD] text-muted-foreground pt-4">
              Each tool call (e.g. search grounding) used in a reply consumes an
              additional standard credit. Models may not always utilize enabled
              tools.
            </p>
          </div>

          <div className="space-y-1 p-4 bg-[#0B080B] rounded-lg">
            <h3 className="text-sm text-[#F9F8FB] font-semibold">
              Keyboard Shortcuts
            </h3>

            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[#F9F8FB] font-medium">Search</span>
                <div className="flex gap-1">
                  <kbd className="flex justify-center items-center px-2 py-1.5 text-xs font-medium rounded bg-[#21141E]">
                    <Command size={11} />
                  </kbd>
                  <kbd className="px-2.5 py-1.5 text-xs font-medium rounded bg-[#21141E]">
                    K
                  </kbd>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#F9F8FB] font-medium">New Chat</span>
                <div className="flex gap-1">
                  <kbd className="flex justify-center items-center px-2 py-1.5 text-xs font-medium rounded bg-[#21141E]">
                    <Command size={11} />
                  </kbd>
                  <kbd className="px-1.5 py-1.5 text-xs font-semibold rounded bg-[#21141E]">
                    <ArrowBigUp size={15} />
                  </kbd>
                  <kbd className="px-2.5 py-1.5 text-xs font-semibold rounded bg-[#21141E]">
                    O
                  </kbd>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#F9F8FB] font-medium">
                  Toggle Sidebar
                </span>
                <div className="flex gap-1">
                  <kbd className="flex justify-center items-center px-2 py-1.5 text-xs font-medium rounded bg-[#21141E]">
                    <Command size={11} />
                  </kbd>
                  <kbd className="px-2.5 py-1.5 text-xs font-semibold rounded  bg-[#21141E]">
                    B
                  </kbd>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#F9F8FB] font-medium">
                  Open Model Picker
                </span>
                <div className="flex gap-1">
                  <kbd className="flex justify-center items-center px-2 py-1.5 text-xs font-medium rounded bg-[#21141E]">
                    <Command size={11} />
                  </kbd>
                  <kbd className="px-2.5 py-1.5 text-xs font-semibold rounded  bg-[#21141E]">
                    /
                  </kbd>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#F9F8FB] font-medium">
                  Delete Current Chat
                </span>
                <div className="flex gap-1">
                  <kbd className="flex justify-center items-center px-2 py-1.5 text-xs font-medium rounded bg-[#21141E]">
                    <Command size={11} />
                  </kbd>
                  <kbd className="px-1.5 py-1.5 text-xs font-semibold rounded bg-[#21141E]">
                    <ArrowBigUp size={15} />
                  </kbd>
                  <kbd className="px-2 py-1.5 text-xs font-semibold rounded  bg-[#21141E]">
                    <Delete size={14} />
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex flex-col">
            <nav className="max-w-2xl bg-red-500 flex p-1 space-y-1">
              <button
                onClick={() => setActiveTab("account")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  activeTab === "account"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <User className="h-4 w-4" />
                Account
              </button>
              <button
                onClick={() => setActiveTab("customization")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  activeTab === "customization"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <SettingsIcon className="h-4 w-4" />
                Customization
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  activeTab === "history"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <History className="h-4 w-4" />
                Chat History
              </button>
              <button
                onClick={() => setActiveTab("api-keys")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  activeTab === "api-keys"
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Key className="h-4 w-4" />
                API Keys
              </button>
            </nav>

            <div className="flex bg-red-700">
              {activeTab === "account" && (
                <div className="space-y-4">
                  {account && (
                    <div className="relative max-w-5xl mx-auto px-6 py-16 space-y-20">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-semibold">
                          Upgrade to Pro
                        </h1>
                        <div className="text-2xl font-semibold">
                          $8
                          <span className="text-sm text-gray-400 font-normal">
                            /month
                          </span>
                        </div>
                      </div>

                      {/* Feature cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-3">
                          <div className="text-pink-500 text-2xl">🚀</div>
                          <h3 className="font-semibold">
                            Access to All Models
                          </h3>
                          <p className="text-sm text-gray-400">
                            Get access to our full suite of models including
                            Claude, o3-mini-high, and more!
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-3">
                          <div className="text-pink-500 text-2xl">✨</div>
                          <h3 className="font-semibold">Generous Limits</h3>
                          <p className="text-sm text-gray-400">
                            Receive{" "}
                            <span className="font-medium text-white">1500</span>{" "}
                            standard credits per month, plus{" "}
                            <span className="font-medium text-white">100</span>{" "}
                            premium credits.
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-3">
                          <div className="text-pink-500 text-2xl">🎧</div>
                          <h3 className="font-semibold">Priority Support</h3>
                          <p className="text-sm text-gray-400">
                            Get faster responses and dedicated assistance from
                            the T3 team whenever you need help!
                          </p>
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="space-y-4">
                        <button className="px-6 py-3 rounded-lg bg-pink-700 hover:bg-pink-600 transition font-medium">
                          Upgrade Now
                        </button>

                        <p className="text-sm text-gray-400 max-w-3xl">
                          * Premium credits are used for models marked with a
                          gem icon in the model selector. This includes, among
                          others, Claude Sonnet, GPT-5 (Reasoning), Grok 3/4,
                          Image Generation models, and Gemini 2.5 Pro.
                          Additional Premium credits can be purchased separately
                          for $8 per 100.{" "}
                          <span className="text-pink-500 hover:underline cursor-pointer">
                            See all premium models
                          </span>
                        </p>
                      </div>

                      {/* Billing Preferences */}
                      <div className="space-y-6">
                        <h2 className="text-2xl font-semibold">
                          Billing Preferences
                        </h2>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Email me receipts</p>
                            <p className="text-sm text-gray-400">
                              Send receipts to your account email when a payment
                              succeeds.
                            </p>
                          </div>

                          {/* Toggle */}
                          <div className="w-12 h-6 bg-white/20 rounded-full relative">
                            <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full" />
                          </div>
                        </div>
                      </div>

                      {/* Security Options */}
                      <div className="space-y-6">
                        <h2 className="text-2xl font-semibold">
                          Security Options
                        </h2>

                        <div className="space-y-3">
                          <p className="font-medium">Devices</p>
                          <p className="text-sm text-gray-400 max-w-xl">
                            Manage and sign out from other devices that are
                            currently logged in to your account.
                          </p>

                          <button className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
                            View Devices
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "customization" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Customization</h2>
                  <p className="text-muted-foreground">
                    Customization options coming soon.
                  </p>
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Chat History</h2>
                  <p className="text-muted-foreground">
                    Chat history management coming soon.
                  </p>
                </div>
              )}

              {activeTab === "api-keys" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">API Keys</h2>
                  {apiKeys ? (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-muted-foreground">
                          BYOK Enabled
                        </label>
                        <p className="font-medium">
                          {apiKeys.byokEnable ? "Yes" : "No"}
                        </p>
                      </div>
                      {apiKeys.apiKey && (
                        <div className="space-y-2">
                          <label className="text-sm text-muted-foreground">
                            API Key
                          </label>
                          <p className="font-mono text-sm bg-muted p-2 rounded">
                            {apiKeys.apiKey.maskedKey}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created:{" "}
                            {new Date(
                              apiKeys.apiKey.createdAt,
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {!apiKeys.apiKey && (
                        <p className="text-muted-foreground">
                          No API key configured.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Loading API keys...</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
