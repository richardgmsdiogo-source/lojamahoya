import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, MailCheck } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });

  // ✅ NOVO: controla o pop-up de confirmação
  const [showConfirmEmailModal, setShowConfirmEmailModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const { login, register, resetPassword, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const result = await login(loginData.email, loginData.password);

    if (result.success) {
      toast({ title: 'Bem-vindo(a) de volta!', description: 'Login realizado com sucesso.' });
      navigate('/');
    } else {
      toast({ title: 'Erro no login', description: result.error || 'Verifique suas credenciais.', variant: 'destructive' });
    }

    setIsSubmitting(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerData.password !== registerData.confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
      return;
    }

    if (registerData.password.length < 6) {
      toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    const result = await register({
      name: registerData.name,
      email: registerData.email,
      phone: registerData.phone,
      password: registerData.password,
    });

    if (result.success) {
      // ✅ Abre o pop-up com a mensagem (em vez de só toast)
      setRegisteredEmail(registerData.email);
      setShowConfirmEmailModal(true);

      // opcional: limpa senha do formulário
      setRegisterData((p) => ({ ...p, password: '', confirmPassword: '' }));
    } else {
      toast({ title: 'Erro no cadastro', description: result.error || 'Tente novamente.', variant: 'destructive' });
    }

    setIsSubmitting(false);
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

  return (
    <Layout>
      {/* ✅ POP-UP de confirmação de e-mail */}
      <Dialog open={showConfirmEmailModal} onOpenChange={setShowConfirmEmailModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-serif">
              <MailCheck className="h-5 w-5 text-accent" />
              Seu grimório foi selado ✨
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-serif">
              Enviamos um <strong>e-mail de confirmação</strong> para:
              <br />
              <span className="text-foreground font-medium">{registeredEmail || 'seu e-mail'}</span>
            </p>

            <p className="text-sm text-muted-foreground font-serif">
              Ele pode chegar em nome de <strong>Supabase</strong>. Se não aparecer na caixa de entrada,
              verifique também o <strong>Spam/Lixo eletrônico</strong> e conclua o ritual.
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 font-serif"
                onClick={() => {
                  setShowConfirmEmailModal(false);
                  // ✅ mantém no /auth para a pessoa confirmar e depois logar
                  // se você preferir, pode navegar para a home:
                  // navigate('/');
                }}
              >
                Entendi
              </Button>

              <Button
                variant="outline"
                className="flex-1 font-serif"
                onClick={() => {
                  setShowConfirmEmailModal(false);
                  // Dica: abre o Gmail em nova aba (opcional)
                  window.open('https://mail.google.com', '_blank', 'noopener,noreferrer');
                }}
              >
                Abrir e-mail
              </Button>
            </div>

            <p className="text-xs text-muted-foreground font-serif">
              Dica: procure por “Mahoya” ou “Supabase” na busca do seu e-mail.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="container py-12 md:py-20">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <Sparkles className="h-10 w-10 text-accent mx-auto mb-4" />
            <h1 className="font-script text-4xl text-primary">Bem-vindo(a)</h1>
          </div>

          <Card className="bg-card border-border">
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="font-serif">Entrar</TabsTrigger>
                <TabsTrigger value="register" className="font-serif">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <CardContent className="pt-6">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label className="font-serif">E-mail</Label>
                      <Input
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Label className="font-serif">Senha</Label>
                      <div className="relative">
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          required
                          disabled={isSubmitting}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full font-serif" disabled={isSubmitting}>
                      {isSubmitting ? 'Entrando...' : 'Entrar'}
                    </Button>

                    <Button
                      type="button"
                      variant="link"
                      className="w-full text-muted-foreground font-serif text-sm"
                      onClick={() => {
                        setForgotEmail(loginData.email);
                        setShowForgotPassword(true);
                      }}
                    >
                      Esqueceu sua senha?
                    </Button>
                  </form>

                  {showForgotPassword && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <h3 className="font-serif text-lg mb-3">Recuperar senha</h3>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setIsSendingReset(true);
                          const result = await resetPassword(forgotEmail);
                          if (result.success) {
                            toast({ title: 'E-mail enviado!', description: 'Verifique sua caixa de entrada para redefinir a senha.' });
                            setShowForgotPassword(false);
                          } else {
                            toast({ title: 'Erro', description: result.error || 'Não foi possível enviar o e-mail.', variant: 'destructive' });
                          }
                          setIsSendingReset(false);
                        }}
                        className="space-y-3"
                      >
                        <div>
                          <Label className="font-serif text-sm">Digite seu e-mail</Label>
                          <Input
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            required
                            disabled={isSendingReset}
                            placeholder="seu@email.com"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 font-serif"
                            onClick={() => setShowForgotPassword(false)}
                          >
                            Cancelar
                          </Button>
                          <Button type="submit" className="flex-1 font-serif" disabled={isSendingReset}>
                            {isSendingReset ? 'Enviando...' : 'Enviar link'}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </CardContent>
              </TabsContent>

              <TabsContent value="register">
                <CardContent className="pt-6">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <Label className="font-serif">Nome completo</Label>
                      <Input
                        value={registerData.name}
                        onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Label className="font-serif">E-mail</Label>
                      <Input
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Label className="font-serif">Telefone</Label>
                      <Input
                        type="tel"
                        value={registerData.phone}
                        onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Label className="font-serif">Senha</Label>
                      <Input
                        type="password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <Label className="font-serif">Confirmar senha</Label>
                      <Input
                        type="password"
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground font-serif">
                      Seus dados serão armazenados com segurança.
                    </p>

                    <Button type="submit" className="w-full font-serif" disabled={isSubmitting}>
                      {isSubmitting ? 'Criando conta...' : 'Criar conta'}
                    </Button>
                  </form>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Auth;
