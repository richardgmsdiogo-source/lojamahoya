import { useState, useEffect } from 'react';
import { Sparkles, Gift, Percent, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  return prizes.find(p => roll >= p.range[0] && roll <= p.range[1]) || prizes[0];
};

export const D20PromoSection = () => {
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [hasRolled, setHasRolled] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isUsed, setIsUsed] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const checkEligibilityAndRoll = async () => {
      if (!isAuthenticated || !user) {
        setIsEligible(false);
        setIsChecking(false);
        return;
      }

      // Check eligibility
      const { data: eligibleData } = await supabase
        .from('d20_eligible_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!eligibleData) {
        setIsEligible(false);
        setIsChecking(false);
        return;
      }

      setIsEligible(true);

      // Check if user already rolled
      const { data: rollData } = await supabase
        .from('d20_rolls')
        .select('roll_result, used_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (rollData) {
        setResult(rollData.roll_result);
        setHasRolled(true);
        setIsUsed(!!rollData.used_at);
      }

      setIsChecking(false);
    };

    checkEligibilityAndRoll();
  }, [user, isAuthenticated]);

  const rollDice = async () => {
    if (isRolling || hasRolled || !user) return;
    
    setIsRolling(true);
    setResult(null);

    // Generate final result first
    const finalResult = Math.floor(Math.random() * 20) + 1;
    const prize = getPrize(finalResult);

    let count = 0;
    const interval = setInterval(async () => {
      setResult(Math.floor(Math.random() * 20) + 1);
      count++;
      if (count > 15) {
        clearInterval(interval);
        setResult(finalResult);
        setIsRolling(false);
        setHasRolled(true);

        // Save to database
        await supabase.from('d20_rolls').insert({
          user_id: user.id,
          roll_result: finalResult,
          prize_code: prize.code || '',
          prize_title: prize.title,
          prize_description: prize.description,
        });
      }
    }, 100);
  };

  // Don't show section if checking or not eligible
  if (isChecking || !isEligible) {
    return null;
  }

  const prize = result ? getPrize(result) : null;

  return (
    <section className="py-16 md:py-24 bg-green-deep/5 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-10 text-gold/20 text-6xl">✦</div>
        <div className="absolute bottom-10 right-10 text-gold/20 text-4xl">✧</div>
        <div className="absolute top-1/2 left-1/4 text-gold/10 text-3xl">⚝</div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <h2 className="font-title text-3xl md:text-4xl text-green-deep mb-4">
            Teste Sua Sorte Alquímica
          </h2>
          <p className="font-body text-green-deep/70 max-w-xl mx-auto">
            Role o dado do destino e descubra qual bênção mágica você receberá em seu primeiro pedido!
          </p>
        </div>

        <div className="max-w-md mx-auto">
          {/* D20 Dice */}
          <div className="flex flex-col items-center gap-8">
            <div 
              className={`relative cursor-pointer
                ${isRolling ? 'animate-wiggle' : ''}
                ${!hasRolled && !isRolling ? 'hover:scale-110 transition-transform duration-300' : ''}
              `}
              onClick={rollDice}
              style={{ width: '140px', height: '160px' }}
            >
              {/* D20 SVG Shape */}
              <svg 
                viewBox="0 0 100 115" 
                className="w-full h-full drop-shadow-lg"
                style={{ filter: result === 20 ? 'drop-shadow(0 0 20px rgba(200, 164, 90, 0.8))' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}
              >
                {/* Main D20 shape - icosahedron face */}
                <polygon 
                  points="50,2 95,28 95,87 50,113 5,87 5,28" 
                  fill="url(#d20Gradient)"
                  stroke="#C8A45A"
                  strokeWidth="2"
                />
                
                {/* Inner triangular faces for 3D effect */}
                <polygon points="50,2 95,28 50,57" fill="rgba(255,255,255,0.1)" />
                <polygon points="50,2 5,28 50,57" fill="rgba(0,0,0,0.1)" />
                <polygon points="95,28 95,87 50,57" fill="rgba(0,0,0,0.15)" />
                <polygon points="5,28 5,87 50,57" fill="rgba(255,255,255,0.05)" />
                <polygon points="50,113 95,87 50,57" fill="rgba(0,0,0,0.2)" />
                <polygon points="50,113 5,87 50,57" fill="rgba(0,0,0,0.1)" />
                
                {/* Edge lines */}
                <line x1="50" y1="2" x2="50" y2="57" stroke="#C8A45A" strokeWidth="0.5" opacity="0.5" />
                <line x1="95" y1="28" x2="50" y2="57" stroke="#C8A45A" strokeWidth="0.5" opacity="0.5" />
                <line x1="5" y1="28" x2="50" y2="57" stroke="#C8A45A" strokeWidth="0.5" opacity="0.5" />
                <line x1="95" y1="87" x2="50" y2="57" stroke="#C8A45A" strokeWidth="0.5" opacity="0.5" />
                <line x1="5" y1="87" x2="50" y2="57" stroke="#C8A45A" strokeWidth="0.5" opacity="0.5" />
                <line x1="50" y1="113" x2="50" y2="57" stroke="#C8A45A" strokeWidth="0.5" opacity="0.5" />
                
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="d20Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4F6B5B" />
                    <stop offset="50%" stopColor="#3E5A4C" />
                    <stop offset="100%" stopColor="#2D4438" />
                  </linearGradient>
                </defs>
                
                {/* Number display */}
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
              
              {/* Sparkle effects on critical */}
              {result === 20 && (
                <>
                  <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-gold animate-pulse" />
                  <Sparkles className="absolute -bottom-2 -left-2 w-6 h-6 text-gold animate-pulse" />
                  <Sparkles className="absolute top-1/2 -right-4 w-5 h-5 text-gold animate-ping" />
                </>
              )}
            </div>

            {/* Roll button or result */}
            {!hasRolled ? (
              <Button 
                onClick={rollDice}
                disabled={isRolling}
                className="btn-seal text-lg px-8 py-6"
              >
                {isRolling ? 'Rolando...' : 'Rolar o D20'}
              </Button>
            ) : prize && (
              <div className={`
                rpg-card p-6 text-center w-full
                ${prize.type === 'special' ? 'ring-2 ring-gold' : ''}
              `}>
                <div className="flex justify-center mb-3">
                  {prize.type === 'discount' && <Percent className="w-8 h-8 text-gold" />}
                  {prize.type === 'gift' && <Gift className="w-8 h-8 text-gold" />}
                  {prize.type === 'special' && <Sparkles className="w-8 h-8 text-gold" />}
                </div>
                
                <h3 className="font-title text-xl text-green-deep mb-2">
                  {prize.title}
                </h3>
                <p className="font-body text-green-deep/80 mb-4">
                  {prize.description}
                </p>
                
                {prize.code && (
                  <div className="bg-parchment-dark/50 rounded-lg p-3 border border-gold/30">
                    {isUsed ? (
                      <div className="flex items-center justify-center gap-2 text-green-deep/60">
                        <Lock className="h-4 w-4" />
                        <span className="text-sm">Prêmio já utilizado</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-green-deep/60">Será aplicado automaticamente no pedido:</span>
                        <p className="font-title text-lg text-gold tracking-wider">
                          {prize.code}
                        </p>
                      </>
                    )}
                  </div>
                )}

                <p className="text-xs text-green-deep/50 mt-4">
                  {isUsed ? 'Este prêmio já foi utilizado em um pedido.' : 'Válido para seu primeiro pedido. Será incluído automaticamente.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
