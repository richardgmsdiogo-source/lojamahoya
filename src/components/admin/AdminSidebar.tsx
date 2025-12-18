import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package2, 
  ShoppingBag, 
  FileText, 
  Factory, 
  Dice6, 
  Tag,
  ChevronLeft,
  Menu,
  PackageCheck,
  Flower2,
  ClipboardList,
  Users,
  DollarSign,
  Building2,
  Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
  { icon: ClipboardList, label: 'Pedidos', path: '/admin/pedidos' },
  { icon: Users, label: 'Clientes', path: '/admin/clientes' },
  { icon: DollarSign, label: 'Financeiro', path: '/admin/financeiro' },
  { icon: Receipt, label: 'Despesas', path: '/admin/despesas' },
  { icon: Building2, label: 'Imobilizado', path: '/admin/imobilizado' },
  { icon: Package2, label: 'Matéria-prima', path: '/admin/materias-primas' },
  { icon: ShoppingBag, label: 'Produtos', path: '/admin/produtos' },
  { icon: FileText, label: 'Receitas', path: '/admin/receitas' },
  { icon: Factory, label: 'Produção', path: '/admin/producao' },
  { icon: PackageCheck, label: 'Estoque & Preços', path: '/admin/estoque' },
  { icon: Tag, label: 'Categorias', path: '/admin/categorias' },
  { icon: Flower2, label: 'Famílias Olfativas', path: '/admin/familias-olfativas' },
  { icon: Dice6, label: 'D20', path: '/admin/d20' },
];

export const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside 
      className={cn(
        "bg-card border-r border-border h-full flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="p-4 flex items-center justify-between border-b border-border">
        {!collapsed && (
          <h2 className="font-title text-lg text-primary">Admin</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                "hover:bg-muted",
                isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
