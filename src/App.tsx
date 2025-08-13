
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import DataEntryPage from "./pages/DataEntryPage";
import EggPackEntryPage from "./pages/EggPackEntryPage";
import FertilityEntryPage from "./pages/FertilityEntryPage";
import QAEntryPage from "./pages/QAEntryPage";
import ResidueEntryPage from "./pages/ResidueEntryPage";
import ManagementPage from "./pages/ManagementPage";
import ChecklistPage from "./pages/ChecklistPage";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import ProtectedRoute from "./components/ProtectedRoute";
import InitializeApp from "./components/InitializeApp";
import ProjectReport from "./pages/ProjectReport";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <InitializeApp>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            } />
            <Route path="/data-entry" element={
              <ProtectedRoute>
                <DataEntryPage />
              </ProtectedRoute>
            } />
            <Route path="/data-entry/house/:houseId/egg-pack" element={
              <ProtectedRoute>
                <EggPackEntryPage />
              </ProtectedRoute>
            } />
            <Route path="/data-entry/house/:houseId/fertility" element={
              <ProtectedRoute>
                <FertilityEntryPage />
              </ProtectedRoute>
            } />
            <Route path="/data-entry/house/:houseId/qa" element={
              <ProtectedRoute>
                <QAEntryPage />
              </ProtectedRoute>
            } />
            <Route path="/data-entry/house/:houseId/residue" element={
              <ProtectedRoute>
                <ResidueEntryPage />
              </ProtectedRoute>
            } />
            <Route path="/checklist" element={
              <ProtectedRoute>
                <ChecklistPage />
              </ProtectedRoute>
            } />
            <Route path="/checklist/house/:houseId" element={
              <ProtectedRoute>
                <ChecklistPage />
              </ProtectedRoute>
            } />
            <Route path="/management" element={
              <ProtectedRoute>
                <ManagementPage />
              </ProtectedRoute>
            } />
            <Route path="/report" element={
              <ProtectedRoute>
                <ProjectReport />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </InitializeApp>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
