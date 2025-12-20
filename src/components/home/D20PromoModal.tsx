import { useEffect, useMemo, useState } from 'react';
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

// Estrutura salva no localStorage
type StoredRoll = {
  roll_result: number;
  prize_code: string;
  prize_title: string;
  prize_description: string;
  used_at?: string | null;
  created_at: string;
};

export const D20PromoModal = () => {
  const { user, isAuthenticated } = useAuth();

  const [open, setOpen] = useState(false);

  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [hasRolled, setHasRolled] = useState(false);
  const [isUsed, setIsUsed] = useState(false);

  // Se não estiver logado, vira "guest"
  const viewerId = useMemo(() => {
    return isAuthenticated && user?.id ? user.id : 'guest';
  }, [isAuthenticated, user?.id]);

  const shownKey = useMemo(() => `mahoya:d20_popup_shown:${viewerId}`, [viewerId]);
  const rollKey = useMemo(() => `mahoya:d20_roll:${viewerId}`, [viewerId]);

  useEffect(() => {
    // 1) Carrega rolagem salva (se existir)
    const raw = localStorage.getItem(rollKey);
    if (raw) {
      try {
        const saved: StoredRoll = JSON.parse(raw);
        setResult(saved.roll_result);
        setHasRolled(true);
        setIsUsed(!!saved.used_at);
      } catch {
        // se der ruim, limpa
        localStorage.removeItem(rollKey);
      }
    } else {
      setResult(null);
      setHasRolled(false);
      setIsUsed(false);
    }

    // 2) Abre popup automaticamente APENAS se ainda não rolou e ainda não foi mostrado
    const alreadyShown = localStorage.getItem(shownKey) === '1';
    const alreadyRolled = !!localStorage.getItem(rollKey);

    if (!alreadyShown && !alreadyRolled) {
      setOpen(true);
      localStorage.setItem(shownKey, '1');
    }
  }, [shownKey, rollKey]);

  const prize = result ? getPrize(result) : null;

  const rollDice = async () => {
    if (isRolling || hasRolled) return;

    setIsRolling(true);
    setResult(null);

    const finalResult = Math.floor(Math.random() * 20) + 1;
    const prizeFinal = getPrize(finalResult);

    let count = 0;
    const interval = setInterval(() => {
      setResult(Math.floor(Math.random() * 20) + 1);
      count++;

      if (count > 15) {
        clearInterval(interval);

        setResult(finalResult);
        setIsRolling(false);
        setHasRolled(true);

        const payload: StoredRoll = {
          roll_result: finalResult,
          prize_code: prizeFinal.code || '',
          prize_title: prizeFinal.title,
          prize_description: prizeFinal.description,
          used_at: null,
          created_at: new Date().toISOString(),
        };

        // ✅ Sempre salva no localStorage (guest ou logado)
        localStorage.setItem(rollKey, JSON.stringify(payload));

        // ✅ Se estiver logado, opcional: também salva no banco
        if (isAuthenticated && user?.id) {
          supabase.from('d20_rolls').insert({
            user_id: user.id,
            roll_result: finalResult,
            prize_code: payload.prize_code,
            prize_title: payload.prize_title,
            prize_description: payload.prize_description,
          });
        }
      }
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-title text-2xl text-green-deep text-center">
            🎲 Role o D20 e ganhe um prêmio
          </DialogTitle>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-xl p-6 bg-green-deep/5">
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute top-6 left-6 text-gold/20 text-5xl">✦</div>
            <div className="absolute bottom-6 right-6 text-gold/20 text-4xl">✧</div>
          </div>

          <div className="relative z-10">
            <p className="font-body text-center text-green-deep/70 max-w-lg mx-auto">
              Boas-vindas, viajante! Role uma vez e receba uma bênção para seu primeiro pedido.
            </p>

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
                <Button onClick={rollDice} disabled={isRolling} className="btn-seal text-lg px-8 py-6">
                  {isRolling ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Rolando...
                    </span>
                  ) : (
                    'Rolar o D20'
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

                  <p className="text-xs text-green-deep/50 mt-4">
                    {isUsed ? 'Este prêmio já foi utilizado.' : 'Guarde esse prêmio para o seu primeiro pedido.'}
                  </p>

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
