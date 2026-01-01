import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, KeyRound } from 'lucide-react';

import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const MIN_PASSWORD_LEN = 6;

function parseHashParams() {
  // Supabase manda tokens no fragment: #access_token=...&type=recovery&...
  const hash = window.location.hash?.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;

  return new URLSearchParams(hash);
}

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isValidSession, setIsValidSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();
  const navigate = useNavigate();

  const recoveryHint = useMemo(() => {
    const params = parseHashParams();
    return {
      type: params.get('type'),
      accessToken: params.get('access_token'),
      error: params.get('error'),
      errorDescription: params.get('error_description'),
    };
  }, []);

  useEffect(() => {
    let active = true;

    const finish = (valid: boolean) => {
      if (!active) return;
      setIsValidSession(valid);
      setIsLoading(false);
    };

    // Se houver erro retornado no hash (ex.: link expirado), já mostra inválido.
    if (recoveryHint.error || recoveryHint.errorDescription) {
      toast({
        title: 'Link inválido',
        description: decodeURIComponent(
          recoveryHint.errorDescription ?? 'Não foi possível validar o link de recuperação.'
        ),
        variant: 'destructive',
      });
      finish(false);
      return () => {
        active = false;
      };
    }

    // 1) O caminho mais confiável: esperar o Supabase reconhecer o link e emitir PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Alguns projetos emitem PASSWORD_RECOVERY; outros podem cair em SIGNED_IN com sessão válida.
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        finish(true);

        // Higiene: remove o hash com tokens da URL (não quebra a sessão já criada).
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });

    // 2) Fallback: se o app já tem sessão (ex.: usuário autenticado), permite reset.
    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        finish(false);
        return;
      }

      if (data.session) {
        finish(true);
        return;
      }

      // 3) Fallback extra: se chegou via e-mail e tem type=recovery + access_token, pelo menos libera a tela
      // (o onAuthStateChange acima normalmente vai “pegar” em seguida).
      if (recoveryHint.type === 'recovery' && recoveryHint.accessToken) {
        // dá um tempo curto pro onAuthStateChange disparar; se não disparar, ainda assim marca válido
        setTimeout(() => finish(true), 400);
        return;
      }

      finish(false);
    })();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const pw = password.trim();
    const cpw = confirmPassword.trim();

    if (pw.length < MIN_PASSWORD_LEN) {
      toast({
        title: 'Erro',
        description: `A senha deve ter pelo menos ${MIN_PASSWORD_LEN} caracteres.`,
        variant: 'destructive',
      });
      return;
    }

    if (pw !== cpw) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        return;
      }

      toast({ title: 'Senha alterada!', description: 'Sua nova senha foi definida com sucesso.' });

      // Opcional: encerra a sessão de recovery e manda pro login
      await supabase.auth.signOut();

      navigate('/auth');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <Sparkles className="h-10 w-10 text-accent mx-auto animate-pulse" />
        </div>
      </Layout>
    );
  }

  if (!isValidSession) {
    return (
      <Layout>
        <div className="container py-12 md:py-20">
          <div className="max-w-md mx-auto text-center">
            <KeyRound className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-script text-3xl text-primary mb-4">Link inválido</h1>
            <p className="text-muted-foreground mb-6">
              Este link de recuperação de senha expirou ou é inválido.
            </p>
            <Button onClick={() => navigate('/auth')} className="font-serif">
              Voltar para login
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-12 md:py-20">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <KeyRound className="h-10 w-10 text-accent mx-auto mb-4" />
            <h1 className="font-script text-4xl text-primary">Nova Senha</h1>
            <p className="text-muted-foreground mt-2">Digite sua nova senha abaixo</p>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <Label className="font-serif">Nova senha</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isSubmitting}
                      placeholder={`Mínimo ${MIN_PASSWORD_LEN} caracteres`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="font-serif">Confirmar nova senha</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    placeholder="Repita a nova senha"
                  />
                </div>

                <Button type="submit" className="w-full font-serif" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Definir nova senha'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default ResetPassword;
