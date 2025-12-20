import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Gift, Percent, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Prize {
  range: [number, number];
  title: string;
  description: string;
  code?: string;
  type: 'discount' | 'gift' | 'special';
}

export const prizes: Prize[] = [
  { range: [1, 5], title: 'Bênção da Natureza', description: '5% de desconto', code: 'MAHOYA5', type: 'discount' },
  { range: [6, 10], title: 'Essência Mística', description: '10% de desconto', code: 'MAHOYA10', type: 'discount' },
  { range: [11, 14], title: 'Poção de Boas-Vindas', description: '15% de desconto', code: 'MAHOYA15', type: 'discount' },
  { range: [15, 17], title: 'Presente Encantado', description: 'Brinde surpresa', code: 'BRINDE', type: 'gift' },
  { range: [18, 19], title: 'Tesouro Alquímico', description: '20% de desconto', code: 'TESOURO20', type: 'special' },
  { range: [20, 20], title: '✨ CRÍTICO! ✨', description: 'Vela artesanal grátis no pedido!', code: 'CRITICO', type: 'special' },
];

export const getPrize = (roll: number): Prize => {
  return prizes.find((p) => roll >= p.range[0] && roll <= p.range[1]) || prizes[0];
};

type Mode = 'guest' | 'd20' | null;

export const PromoPopups = () => {
  const { user, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<Mode>(null);
  const [open, setOpen] = useState(false);

  // D20 states
  const [isChecking, setIsChecking] = useState(true);
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [hasRolled, setHasRolled] = useState(false);
  const [isUsed, setIsUsed] = useState(false);

  // Keys
  const guestShownKey = 'mahoya:signup_popup_shown:v1';
  const d20ShownKey = useMemo(() => (user?.id ? `mahoya:d20_popup_shown:${user.id}` : ''), [user?.id]);

  useEffect(() => {
    let alive = true;

    async function run() {
      // === GUEST: popup chamando cadastro ===
      if (!isAuthenticated || !user?.id) {
        if (!alive) return;

        setMode('guest');
        setIsChecking(false);

        const alreadyShown = localStorage.getItem(guestShownKey) === '1';
        if (!alreadyShown) {
          setOpen(true);
          localStorage.setItem(guestShownKey, '1'); // mostra 1x por navegador/dispositivo
        } else {
          setOpen(false);
        }
        return;
      }

      // === LOGADO: popup do D20 ===
      setMode('d20');
      setIsChecking(true);

      const alreadyShownD20 = localStorage.getItem(d20ShownKey) === '1';

      // ver se já rolou no banco
      const { data: rollData, error: rollError } = await supabase
      .from('d20_rolls')
      .select('roll_result, used_at, rolled_at')
      .eq('user_id', user.id)
      .order('rolled_at', { ascending: false })
      .limit(1)
      .maybeSingle();

        if (rollError) {
        console.error('Erro ao buscar rolagem D20:', rollError);
        setOpen(false);
        setIsChecking(false);
        return;
        }


      if (!alive) return;

      if (rollData) {
        setResult(rollData.roll_result);
        setHasRolled(true);
        setIsUsed(!!rollData.used_at);
      } else {
        setResult(null);
        setHasRolled(false);
        setIsUsed(false);
        setOpen(true); // ✅ todo logado sem rolagem ganha o D20
      }

      setIsChecking(false);

      // abre D20 apenas se ainda não rolou e não foi mostrado antes
      if (!rollData && !alreadyShownD20) {
        setOpen(true);
        localStorage.setItem(d20ShownKey, '1');
      } else {
        setOpen(false);
      }
    }

    run();

    return () => {
      alive = false;
    };
  }, [isAuthenticated, user?.id, d20ShownKey]);

  const prize = result ? getPrize(result) : null;

  const rollDice = async () => {
    if (isRolling || hasRolled || !user?.id) return;

    setIsRolling(true);
    setResult(null);

    const finalResult = Math.floor(Math.random() * 20) + 1;
    const prizeFinal = getPrize(finalResult);

    let count = 0;
    const interval = setInterval(async () => {
      setResult(Math.floor(Math.random() * 20) + 1);
      count++;

      if (count > 15) {
        clearInterval(interval);

        setResult(finalResult);
        setIsRolling(false);
        setHasRolled(true);

        const { error: insertError } = await supabase.from('d20_rolls').insert({
        user_id: user.id,
        roll_result: finalResult,
        prize_code: prizeFinal.code || '',
        prize_title: prizeFinal.title,
        prize_description: prizeFinal.description,
        });

        if (insertError) {
        // 23505 = já existe rolagem para esse user_id
        if ((insertError as any).code === '23505') {
            const { data: existing } = await supabase
            .from('d20_rolls')
            .select('roll_result, used_at, rolled_at')
            .eq('user_id', user.id)
            .order('rolled_at', { ascending: false })
            .limit(1)
            .maybeSingle();

            if (existing) {
            setResult(existing.roll_result);
            setHasRolled(true);
            setIsUsed(!!existing.used_at);
            }
        } else {
            console.error('Erro ao inserir rolagem:', insertError);
        }

        setIsRolling(false);
        return;
        }
      }
    }, 100);
  };

  // não renderiza nada se ainda não decidiu o modo
  if (!mode) return null;

  // ===== POPUP GUEST =====
  if (mode === 'guest') {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-title text-2xl text-green-deep text-center">
              Você adentra um ateliê alquimista em busca de suprimentos.
            </DialogTitle>
          </DialogHeader>

          <div className="rounded-xl p-6 bg-green-deep/5">
            <div className="space-y-4 text-center">
              <p className="font-body text-green-deep/80">
                “Ah… um novo aventureiro.” — exclama a Druida atrás do balcão.
              </p>

              <p className="font-body text-green-deep/70">
                "Seja bem-vindo ao mundo mágico dos aromas da Mahoya.
                <br />
                Por aqui, toda jornada começa com um pequeno ritual: registre-se em nosso Grimório e confie sua sorte ao destino."
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
            asChild
            className="bg-green-deep text-parchment hover:bg-green-deep/90 border border-gold"
            >
            <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="w-full flex items-center justify-center"
            >
                Registre-se
            </Link>
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
                Agora não
            </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }


  // ===== POPUP D20 (LOGADO) =====
  if (isChecking) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-title text-2xl text-green-deep text-center">
            Testando a sua sorte
          </DialogTitle>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-xl p-6 bg-green-deep/5">
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute top-6 left-6 text-gold/20 text-5xl">✦</div>
            <div className="absolute bottom-6 right-6 text-gold/20 text-4xl">✧</div>
          </div>

          <div className="relative z-10">
            <div className="text-center space-y-3">
            <p className="italic text-green-deep/60">
                “Nenhum aventureiro segue adiante de mãos vazias.”
            </p>

            <p className="font-body text-green-deep/70 max-w-lg mx-auto">

            </p>
            </div>

            <div className="mt-6 flex flex-col items-center gap-6">
              {/* D20 */}
              <div
                className={`relative cursor-pointer
                  ${isRolling ? 'animate-wiggle' : ''}
                  ${!hasRolled && !isRolling ? 'hover:scale-110 transition-transform duration-300' : ''}
                `}
                onClick={rollDice}
                style={{ width: '140px', height: '160px' }}
              >
                <svg
                  viewBox="0 0 100 115"
                  className="w-full h-full drop-shadow-lg"
                  style={{
                    filter:
                      result === 20
                        ? 'drop-shadow(0 0 20px rgba(200, 164, 90, 0.8))'
                        : 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                  }}
                >
                  <polygon
                    points="50,2 95,28 95,87 50,113 5,87 5,28"
                    fill="url(#d20Gradient)"
                    stroke="#C8A45A"
                    strokeWidth="2"
                  />

                  <polygon points="50,2 95,28 50,57" fill="rgba(255,255,255,0.1)" />
                  <polygon points="50,2 5,28 50,57" fill="rgba(0,0,0,0.1)" />
                  <polygon points="95,28 95,87 50,57" fill="rgba(0,0,0,0.15)" />
                  <polygon points="5,28 5,87 50,57" fill="rgba(255,255,255,0.05)" />
                  <polygon points="50,113 95,87 50,57" fill="rgba(0,0,0,0.2)" />
                  <polygon points="50,113 5,87 50,57" fill="rgba(0,0,0,0.1)" />

                  <defs>
                    <linearGradient id="d20Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4F6B5B" />
                      <stop offset="50%" stopColor="#3E5A4C" />
                      <stop offset="100%" stopColor="#2D4438" />
                    </linearGradient>
                  </defs>

                  <text
                    x="50"
                    y="62"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={`font-title ${isRolling ? 'blur-[2px]' : ''}`}
                    fill="#C8A45A"
                    fontSize="28"
                    fontWeight="bold"
                    style={{ fontFamily: 'Cinzel, serif' }}
                  >
                    {result || '?'}
                  </text>
                </svg>

                {result === 20 && (
                  <>
                    <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-gold animate-pulse" />
                    <Sparkles className="absolute -bottom-2 -left-2 w-6 h-6 text-gold animate-pulse" />
                    <Sparkles className="absolute top-1/2 -right-4 w-5 h-5 text-gold animate-ping" />
                  </>
                )}
              </div>

              {!hasRolled ? (

                <Button
                onClick={rollDice}
                disabled={isRolling}
                className="text-lg px-8 py-6 bg-green-deep text-parchment hover:bg-green-deep/90 border border-gold"
                >

                  {isRolling ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Rolando...
                    </span>
                  ) : (
                    'Role o D20'
                  )}
                </Button>
              ) : prize ? (
                <div className={`rpg-card p-6 text-center w-full ${prize.type === 'special' ? 'ring-2 ring-gold' : ''}`}>
                  <div className="flex justify-center mb-3">
                    {prize.type === 'discount' && <Percent className="w-8 h-8 text-gold" />}
                    {prize.type === 'gift' && <Gift className="w-8 h-8 text-gold" />}
                    {prize.type === 'special' && <Sparkles className="w-8 h-8 text-gold" />}
                  </div>

                  <h3 className="font-title text-xl text-green-deep mb-2">{prize.title}</h3>
                  <p className="font-body text-green-deep/80 mb-4">{prize.description}</p>

                  {prize.code && (
                    <div className="bg-parchment-dark/50 rounded-lg p-3 border border-gold/30">
                      {isUsed ? (
                        <div className="flex items-center justify-center gap-2 text-green-deep/60">
                          <Lock className="h-4 w-4" />
                          <span className="text-sm">Prêmio já utilizado</span>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm text-green-deep/60">Código do prêmio:</span>
                          <p className="font-title text-lg text-gold tracking-wider">{prize.code}</p>
                        </>
                      )}
                    </div>
                  )}

                  <div className="mt-4">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                      Fechar
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
