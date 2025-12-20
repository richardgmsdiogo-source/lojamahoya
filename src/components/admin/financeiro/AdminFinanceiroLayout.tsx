import { Outlet } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const AdminFinanceiroLayout = () => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-title text-xl">Financeiro</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Selecione uma área no menu (Fluxo de Caixa, DRE, etc.).
        </CardContent>
      </Card>

      <Outlet />
    </div>
  );
};
