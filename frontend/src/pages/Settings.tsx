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
  LogOut,
  Monitor,
  Sun,
  Moon,
  User,
  History,
  Key,
  Settings as SettingsIcon,
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
  const [resetTime, setResetTime] = useState<string>("");

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
          total: accountData.isPremium ? 250 : 20,
        });

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(5, 29, 0, 0);
        setResetTime(
          tomorrow.toLocaleString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
        );
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

  const getTotalCredits = () => {
    if (!account) return 20;
    return account.isPremium ? 250 : 20;
  };

  const getRemainingCredits = () => {
    if (!credits) return 0;
    return credits.remaining;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

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
        <div className="w-80 border-r border-border p-6 space-y-6">
          <div className="flex flex-col items-center gap-4 pb-6">
            <div className="w-40 h-40 rounded-full bg-[#A2014D] flex items-center justify-center text-white font-semibold">
              {account?.name?.[0]?.toUpperCase() ||
                account?.email?.[0]?.toUpperCase() ||
                "U"}
            </div>
            <div className="flex flex-col justify-center items-center min-w-0">
              <h2 className="font-semibold text-2xl truncate">
                {account?.name || "User"}
              </h2>
              <p className="text-md text-[#D4C7E1] text-muted-foreground truncate">
                {account?.email}
              </p>
              <p className="text-xs border rounded-full max-w-40 px-3 text-muted-foreground mt-1">
                {account?.isPremium ? "Premium" : "Free"} Plan
              </p>
            </div>
          </div>

          <div className="space-y-3 bg-black">
            <div>
              <h3 className="text-sm font-medium mb-1">Message Usage</h3>
              <p className="text-xs text-muted-foreground">
                Resets tomorrow at {resetTime}
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Standard</span>
                <span className="font-medium">
                  {getRemainingCredits()}/{getTotalCredits()}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-[#A2014D] h-2 rounded-full transition-all"
                  style={{
                    width: `${(getRemainingCredits() / getTotalCredits()) * 100}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {getRemainingCredits()} messages remaining
              </p>
            </div>
            <p className="text-xs text-muted-foreground pt-2">
              Each tool call (e.g. search grounding) used in a reply consumes an
              additional standard credit. Models may not always utilize enabled
              tools.
            </p>
          </div>

          <div className="space-y-3 pt-4 bg-black">
            <h3 className="text-sm font-medium">Keyboard Shortcuts</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Search</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border">
                  ⌘ K
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">New Chat</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border">
                  ⌘ ⇧ O
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Toggle Sidebar</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border">
                  ⌘ B
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Open Model Picker</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border">
                  ⌘ /
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Delete Current Chat
                </span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border">
                  ⌘ ⇧ ⌫
                </kbd>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex flex-col">
            <nav className="max-w-2xl flex  p-4 space-y-1">
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

            <div className="flex-1 p-6">
              {activeTab === "account" && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">Account</h2>
                  {account && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-muted-foreground">
                          Email
                        </label>
                        <p className="font-medium">{account.email}</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">
                          Name
                        </label>
                        <p className="font-medium">
                          {account.name || "Not set"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">
                          Email Verified
                        </label>
                        <p className="font-medium">
                          {account.isEmailVerified ? "Yes" : "No"}
                        </p>
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
