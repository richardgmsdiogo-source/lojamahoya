import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sparkles, KeyRound } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isValidSession, setIsValidSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user came from a password reset email
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check URL for recovery token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (type === 'recovery' && accessToken) {
        setIsValidSession(true);
      } else if (session) {
        setIsValidSession(true);
      }
      
      setIsLoading(false);
    };
    
    checkSession();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
      return;
    }
    
    if (password.length < 6) {
      toast({ title: 'Erro', description: 'A senha deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    
    setIsSubmitting(true);
    
    const { error } = await supabase.auth.updateUser({ password });
    
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Senha alterada!', description: 'Sua nova senha foi definida com sucesso.' });
      navigate('/auth');
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
                      placeholder="Mínimo 6 caracteres"
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
