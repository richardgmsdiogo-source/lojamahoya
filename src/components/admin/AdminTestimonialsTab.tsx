import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type TestimonialStatus = "pending" | "approved" | "rejected";

type TestimonialRow = {
  id: string;
  user_id: string;
  rating: number;
  text: string;
  status: TestimonialStatus;
  created_at: string;
  profile?: { name: string | null; email: string | null } | null;
};

export const AdminTestimonialsTab = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<TestimonialRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("testimonials")
      .select("id,user_id,rating,text,status,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const rows = (data || []) as unknown as TestimonialRow[];

    // opcional: puxar profiles (nome/email) pra facilitar
    const userIds = rows.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,name,email")
      .in("id", userIds);

    const enriched = rows.map(r => ({
      ...r,
      profile: profiles?.find(p => p.id === r.user_id) ?? null,
    }));

    setItems(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const setStatus = async (id: string, status: TestimonialStatus) => {
    const { error } = await supabase
      .from("testimonials")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Atualizado", description: `Relato marcado como ${status}.` });
    fetchItems();
  };

  const badgeVariant = (s: TestimonialStatus) => {
    if (s === "approved") return "secondary";
    if (s === "rejected") return "destructive";
    return "outline";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatos de Jornada</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground">Nenhum relato ainda.</p>
        ) : (
          items.map((t) => (
            <div key={t.id} className="p-4 rounded-lg border bg-card space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant={badgeVariant(t.status)}>{t.status}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {t.profile?.name || t.profile?.email || t.user_id}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setStatus(t.id, "pending")}>
                    Preenchido
                  </Button>
                  <Button size="sm" onClick={() => setStatus(t.id, "approved")}>
                    Pendurar
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setStatus(t.id, "rejected")}>
                    Rasgar
                  </Button>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                ⭐ {t.rating}/5 • {new Date(t.created_at).toLocaleString("pt-BR")}
              </div>

              <p className="font-serif italic">“{t.text}”</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
