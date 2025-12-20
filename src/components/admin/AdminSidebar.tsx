import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  DollarSign,
  Receipt,
  Building2,
  Package2,
  ShoppingBag,
  FileText,
  Factory,
  PackageCheck,
  Tag,
  Flower2,
  MessageSquare,
  ChevronLeft,
  Menu,
  FlaskConical,      // receitas/fórmulas
  Boxes,             // inventário
  ScrollText,        // grimório
  BadgeCheck,        // conquistas/benefícios
  Sparkles,          // títulos/xp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

type MenuItem = {
  icon: any;
  label: string;
  path: string;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const sections: MenuSection[] = [
  {
    title: '🔥 Criações & Fórmulas',
    items: [
      { icon: Tag, label: 'Categoria', path: '/admin/categorias' },
      { icon: Flower2, label: 'Famílias Olfativas', path: '/admin/familias-olfativas' },
      { icon: Package2, label: 'Matéria-Prima', path: '/admin/materias-primas' },
      { icon: ShoppingBag, label: 'Produtos', path: '/admin/produtos' },
      { icon: FlaskConical, label: 'Receitas', path: '/admin/receitas' },
    ],
  },
  {
    title: '📦 Estoque & Preparos',
    items: [
      { icon: Factory, label: 'Produção', path: '/admin/producao' },
      { icon: Boxes, label: 'Inventário Alquímico', path: '/admin/estoque' }, // estoque + precificação
    ],
  },
  {
    title: '🛒 Pedidos & Encomendas',
    items: [
      { icon: ClipboardList, label: 'Pedidos', path: '/admin/pedidos' },
      // sugestão: página específica pra “Encomendas” (ou filtro dentro de pedidos)
      { icon: FileText, label: 'Encomendas', path: '/admin/encomendas' },
    ],
  },
  {
    title: '🧙‍♂️ Registros no Grimório',
    items: [
      { icon: Users, label: 'Dados de cadastro', path: '/admin/clientes' }, // nome/email/telefone/endereço
      { icon: Sparkles, label: 'XP & Títulos', path: '/admin/xp-titulos' },
      { icon: ScrollText, label: 'Histórico de Compras', path: '/admin/historico-compras' },
      { icon: BadgeCheck, label: 'Benefícios Ativos', path: '/admin/beneficios' },
      { icon: BadgeCheck, label: 'Conquistas', path: '/admin/conquistas' },
      { icon: MessageSquare, label: 'Relatos', path: '/admin/relatos' },
    ],
  },
  {
    title: '📊 Relatórios do Conselho',
    items: [
      { icon: DollarSign, label: 'Fluxo de Caixa', path: '/admin/financeiro/fluxo-caixa' },
      { icon: Receipt, label: 'Contas a Pagar', path: '/admin/financeiro/contas-a-pagar' },
      { icon: Receipt, label: 'Contas a Receber', path: '/admin/financeiro/contas-a-receber' },
      //{ icon: FileText, label: 'Conciliações', path: '/admin/financeiro/conciliacoes' },
      { icon: FileText, label: 'DRE', path: '/admin/financeiro/dre' },
      { icon: Building2, label: 'Imobilizado', path: '/admin/imobilizado' },
      { icon: FileText, label: 'Balanço Patrimonial', path: '/admin/financeiro/balanco' },
    ],
  },
];

// topo fixo (sempre aparece)
const topItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
];

export const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'bg-card border-r border-border h-full flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-72'
      )}
    >
      <div className="p-4 flex items-center justify-between border-b border-border">
        {!collapsed && <h2 className="font-title text-lg text-primary">Painel Admin</h2>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto">
        {/* Itens do topo */}
        <div className="space-y-1">
          {topItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  'hover:bg-muted',
                  isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>

        <div className="my-3 border-t border-border" />

        {/* Seções */}
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="px-3 pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {section.title}
                </p>
              )}

              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                        'hover:bg-muted',
                        isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'
                      )
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>
    </aside>
  );
};
