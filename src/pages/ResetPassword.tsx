import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, KeyRound, ShieldCheck, LogIn } from 'lucide-react';

import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const MIN_PASSWORD_LEN = 6;

function parseHashParams() {
  const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  return new URLSearchParams(hash);
}

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isValidSession, setIsValidSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ NOVO: pop-up de sucesso
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

    if (recoveryHint.error || recoveryHint.errorDescription) {
      toast({
        title: 'Link inválido',
        description: decodeURIComponent(recoveryHint.errorDescription ?? 'Não foi possível validar o link de recuperação.'),
        variant: 'destructive',
      });
      finish(false);
      return () => {
        active = false;
      };
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        finish(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });

    (async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) return finish(false);

      if (data.session) return finish(true);

      if (recoveryHint.type === 'recovery' && recoveryHint.accessToken) {
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

      // ✅ Em vez de só toast, abre o pop-up “Mahoya style”
      setShowSuccessModal(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const finishAndGoLogin = async () => {
    // encerra sessão de recovery e manda pro login
    await supabase.auth.signOut();
    navigate('/auth');
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
            <p className="text-muted-foreground mb-6">Este link de recuperação de senha expirou ou é inválido.</p>
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
      {/* ✅ POP-UP de sucesso ao redefinir a senha */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <ShieldCheck className="h-5 w-5 text-accent" />
              Selo reforjado ✨
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-serif">
              Sua nova senha foi definida com sucesso. A partir de agora, este é o seu novo <strong>ritual de acesso</strong> à Mahoya.
            </p>

            <p className="text-sm text-muted-foreground font-serif">
              Para sua segurança, vamos encerrar este portal de recuperação e te levar de volta ao login.
            </p>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1 font-serif" onClick={finishAndGoLogin}>
                <LogIn className="h-4 w-4 mr-2" />
                Ir para login
              </Button>

              <Button
                variant="outline"
                className="flex-1 font-serif"
                onClick={() => {
                  setShowSuccessModal(false);
                  // opcional: mantém na tela, mas normalmente é melhor mandar pro login
                }}
              >
                Ficar aqui
              </Button>
            </div>

            <p className="text-xs text-muted-foreground font-serif">
              Dica: guarde sua senha como um amuleto — e evite compartilhá-la com terceiros.
            </p>
          </div>
        </DialogContent>
      </Dialog>

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
