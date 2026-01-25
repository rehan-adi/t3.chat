import Chat from "./pages/Chat";
import Done from "./pages/Done";
import Verify from "./pages/Verify";
import Signin from "./pages/SignIn";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import VerifyOtp from "./pages/VerifyOtp";
import Subscription from "./pages/Subscription";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/hooks/use-theme";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Chat />} />
              <Route path="/signin" element={<Signin />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/verify-otp" element={<VerifyOtp />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/subscription/verify" element={<Verify />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/done" element={<Done />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
