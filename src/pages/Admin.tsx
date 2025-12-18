import { useEffect } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { AdminRawMaterialsTab } from '@/components/admin/AdminRawMaterialsTab';
import { AdminProductsTab } from '@/components/admin/AdminProductsTab';
import { AdminRecipesTab } from '@/components/admin/AdminRecipesTab';
import { AdminProductionTab } from '@/components/admin/AdminProductionTab';
import { AdminCategoriesTab } from '@/components/admin/AdminCategoriesTab';
import { AdminScentFamiliesTab } from '@/components/admin/AdminScentFamiliesTab';
import { AdminD20Tab } from '@/components/admin/AdminD20Tab';
import { AdminFinishedGoodsTab } from '@/components/admin/AdminFinishedGoodsTab';
import { AdminOrdersTab } from '@/components/admin/AdminOrdersTab';
import { AdminCustomersTab } from '@/components/admin/AdminCustomersTab';
import { AdminFinanceiroTab } from '@/components/admin/AdminFinanceiroTab';
import { AdminImobilizadoTab } from '@/components/admin/AdminImobilizadoTab';
import { AdminDespesasTab } from '@/components/admin/AdminDespesasTab';

const Admin = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/');
    }
  }, [isAuthenticated, isAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Shield className="h-10 w-10 text-accent animate-pulse" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="pedidos" element={<AdminOrdersTab />} />
          <Route path="clientes" element={<AdminCustomersTab />} />
          <Route path="financeiro" element={<AdminFinanceiroTab />} />
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
        </Routes>
      </main>
    </div>
  );
};

export default Admin;
