import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// 👇 ADICIONE
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const Auth = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const { login, register, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // 👇 ADICIONE
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // 👇 ADICIONE
  useEffect(() => {
    // se o usuário já digitou email no login, reaproveita no modal
    setResetEmail(loginData.email || '');
  }, [loginData.email]);

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
      password: registerData.password
    });

    if (result.success) {
      toast({ title: 'Conta criada!', description: 'Bem-vindo(a) à Mahoya.' });
      navigate('/');
    } else {
      toast({ title: 'Erro no cadastro', description: result.error || 'Tente novamente.', variant: 'destructive' });
    }

    setIsSubmitting(false);
  };

  // 👇 ADICIONE
  const handleForgotPassword = async () => {
    const email = resetEmail.trim();
    if (!email) {
      toast({ title: 'Informe seu e-mail', description: 'Digite o e-mail para receber o link de recuperação.', variant: 'destructive' });
      return;
    }

    setResetSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setResetSubmitting(false);

    if (error) {
      toast({ title: 'Não foi possível enviar o link', description: error.message, variant: 'destructive' });
      return;
    }

    toast({
      title: 'Link enviado!',
      description: 'Confira seu e-mail (e a caixa de spam) para redefinir a senha.',
    });
    setResetOpen(false);
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

                    {/* 👇 ADICIONE */}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="link"
                        className="px-0 font-serif text-sm"
                        disabled={isSubmitting}
                        onClick={() => setResetOpen(true)}
                      >
                        Esqueceu a senha?
                      </Button>
                    </div>

                    <Button type="submit" className="w-full font-serif" disabled={isSubmitting}>
                      {isSubmitting ? 'Entrando...' : 'Entrar'}
                    </Button>
                  </form>
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

          {/* 👇 ADICIONE: MODAL DE RECUPERAÇÃO */}
          <Dialog open={resetOpen} onOpenChange={setResetOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-serif">Recuperar senha</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label className="font-serif">E-mail</Label>
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    disabled={resetSubmitting}
                  />
                </div>

                <Button
                  className="w-full font-serif"
                  onClick={handleForgotPassword}
                  disabled={resetSubmitting}
                >
                  {resetSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
                </Button>

                <p className="text-xs text-muted-foreground font-serif">
                  Você receberá um e-mail com um link para definir uma nova senha.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
};

export default Auth;
