import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

import { AdminRawMaterialsTab } from "@/components/admin/AdminRawMaterialsTab";
import { AdminProductsTab } from "@/components/admin/AdminProductsTab";
import { AdminRecipesTab } from "@/components/admin/AdminRecipesTab";
import { AdminProductionTab } from "@/components/admin/AdminProductionTab";
import { AdminCategoriesTab } from "@/components/admin/AdminCategoriesTab";
import { AdminScentFamiliesTab } from "@/components/admin/AdminScentFamiliesTab";
import { AdminD20Tab } from "@/components/admin/AdminD20Tab";
import { AdminFinishedGoodsTab } from "@/components/admin/AdminFinishedGoodsTab";
import { AdminOrdersTab } from "@/components/admin/AdminOrdersTab";
import { AdminCustomersTab } from "@/components/admin/AdminCustomersTab";
import { AdminImobilizadoTab } from "@/components/admin/AdminImobilizadoTab";
import { AdminDespesasTab } from "@/components/admin/AdminDespesasTab";
import { AdminTestimonialsTab } from "@/components/admin/AdminTestimonialsTab";
import { AdminInternalOrdersTab } from "@/components/admin/AdminInternalOrdersTab";

// ✅ novas páginas do financeiro
import { AdminFinanceiroLayout } from "@/components/admin/financeiro/AdminFinanceiroLayout";
import { AdminCashFlowTab } from "@/components/admin/financeiro/AdminCashFlowTab";
import { AdminContasPagarTab } from "@/components/admin/financeiro/AdminContasPagarTab";
import { AdminContasReceberTab } from "@/components/admin/financeiro/AdminContasReceberTab";
import { AdminConciliacoesTab } from "@/components/admin/financeiro/AdminConciliacoesTab";
import { AdminDRETab } from "@/components/admin/financeiro/AdminDRETab";
import { AdminBalancoTab } from "@/components/admin/financeiro/AdminBalancoTab";

const Admin = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  // ✅ Guard de rota (sem useNavigate, mais estável)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Shield className="h-10 w-10 text-accent animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar />

      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route index element={<AdminDashboard />} />

          <Route path="pedidos" element={<AdminOrdersTab />} />
          <Route path="encomendas" element={<AdminInternalOrdersTab />} />
          <Route path="clientes" element={<AdminCustomersTab />} />

          {/* ✅ FINANCEIRO NOVO (rotas separadas) */}
          <Route path="financeiro" element={<AdminFinanceiroLayout />}>
            <Route index element={<Navigate to="fluxo-caixa" replace />} />
            <Route path="fluxo-caixa" element={<AdminCashFlowTab />} />
            <Route path="contas-a-pagar" element={<AdminContasPagarTab />} />
            <Route path="contas-a-receber" element={<AdminContasReceberTab />} />
            <Route path="conciliacoes" element={<AdminConciliacoesTab />} />
            <Route path="dre" element={<AdminDRETab />} />
            <Route path="balanco" element={<AdminBalancoTab />} />
          </Route>

          {/* fora do financeiro */}
          <Route path="despesas" element={<AdminDespesasTab />} />
          <Route path="imobilizado" element={<AdminImobilizadoTab />} />

          <Route path="materias-primas" element={<AdminRawMaterialsTab />} />
          <Route path="produtos" element={<AdminProductsTab />} />
          <Route path="receitas" element={<AdminRecipesTab />} />
          <Route path="producao" element={<AdminProductionTab />} />
          <Route path="estoque" element={<AdminFinishedGoodsTab />} />

          <Route path="categorias" element={<AdminCategoriesTab />} />
          <Route path="familias-olfativas" element={<AdminScentFamiliesTab />} />
          <Route path="d20" element={<AdminD20Tab />} />
          <Route path="relatos" element={<AdminTestimonialsTab />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default Admin;
