import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Catalogo from "./pages/Catalogo";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Pedido from "./pages/Pedido";
import MinhaConta from "./pages/MinhaConta";
import FAQ from "./pages/FAQ";
import Contato from "./pages/Contato";
import Sobre from "./pages/Sobre";
import NotFound from "./pages/NotFound";
import Politicas from '@/pages/Politicas';
import Termos from '@/pages/Termos';
import Trocas from '@/pages/Trocas';
import ResetPassword from '@/pages/ResetPassword';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/catalogo" element={<Catalogo />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin/*" element={<Admin />} />
              <Route path="/pedido" element={<Pedido />} />
              <Route path="/minha-conta" element={<MinhaConta />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contato" element={<Contato />} />
              <Route path="/sobre" element={<Sobre />} />
              <Route path="*" element={<NotFound />} />
              <Route path="/privacidade" element={<Politicas />} />
              <Route path="/termos" element={<Termos />} />
              <Route path="/trocas" element={<Trocas />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
