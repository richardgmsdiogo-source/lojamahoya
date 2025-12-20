import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ResetPassword() {
  const [loadingSession, setLoadingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Quando o usuário chega aqui pelo link do e-mail, o Supabase usa o token do URL
    // e pode criar uma sessão temporária para permitir updateUser().
    const init = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        toast({ title: "Link inválido", description: error.message, variant: "destructive" });
      }

      // Se não tiver sessão, geralmente o link expirou ou a URL de redirect está errada.
      if (!data.session) {
        toast({
          title: "Link inválido ou expirado",
          description: "Peça novamente a recuperação de senha.",
          variant: "destructive",
        });
      }

      setLoadingSession(false);
    };

    init();
  }, [toast]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: "Senha fraca", description: "Use pelo menos 6 caracteres.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Erro", description: "As senhas não coincidem.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    setIsSubmitting(false);

    if (error) {
      toast({ title: "Não foi possível atualizar", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Senha atualizada!", description: "Agora você já pode entrar com a nova senha." });
    navigate("/auth");
  };

  return (
    <Layout>
      <div className="container py-12 md:py-20">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <Sparkles className="h-10 w-10 text-accent mx-auto mb-4" />
            <h1 className="font-script text-4xl text-primary">Nova Senha</h1>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              {loadingSession ? (
                <div className="py-10 text-center">
                  <Sparkles className="h-8 w-8 text-accent mx-auto animate-pulse" />
                </div>
              ) : (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <Label className="font-serif">Nova senha</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div>
                    <Label className="font-serif">Confirmar nova senha</Label>
                    <Input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full font-serif" disabled={isSubmitting}>
                    {isSubmitting ? "Salvando..." : "Salvar nova senha"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
