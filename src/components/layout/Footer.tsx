import { Link } from 'react-router-dom';
import { Leaf, Flame, Sparkles, Heart } from 'lucide-react';
import mahoyaLogo from '@/assets/mahoya-logo.png';

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={mahoyaLogo} alt="Mahoya" className="h-16 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground font-serif leading-relaxed">
              Aromas artesanais para momentos mágicos a dois. Cada produto é feito com carinho e ingredientes selecionados.
            </p>
            <div className="flex gap-2 mt-4">
              <Leaf className="h-4 w-4 text-primary" />
              <Flame className="h-4 w-4 text-accent" />
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-script text-xl text-primary mb-4">Navegação</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/catalogo" className="text-sm text-muted-foreground hover:text-primary transition-colors font-serif">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link to="/sobre" className="text-sm text-muted-foreground hover:text-primary transition-colors font-serif">
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-sm text-muted-foreground hover:text-primary transition-colors font-serif">
                  Perguntas Frequentes
                </Link>
              </li>
              <li>
                <Link to="/contato" className="text-sm text-muted-foreground hover:text-primary transition-colors font-serif">
                  Contato
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-script text-xl text-primary mb-4">Produtos</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/catalogo?categoria=home-spray" className="text-sm text-muted-foreground hover:text-primary transition-colors font-serif">
                  Home Sprays
                </Link>
              </li>
              <li>
                <Link to="/catalogo?categoria=velas" className="text-sm text-muted-foreground hover:text-primary transition-colors font-serif">
                  Velas
                </Link>
              </li>
              <li>
                <Link to="/catalogo?categoria=agua-lencois" className="text-sm text-muted-foreground hover:text-primary transition-colors font-serif">
                  Água de Lençóis
                </Link>
              </li>
              <li>
                <Link to="/catalogo?categoria=kits" className="text-sm text-muted-foreground hover:text-primary transition-colors font-serif">
                  Kits Presente
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h4 className="font-script text-xl text-primary mb-4">Políticas</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/privacidade" className="text-sm text-muted-foreground hover:text-primary transition-colors font-serif">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/termos" className="text-sm text-muted-foreground hover:text-primary transition-colors font-serif">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/trocas" className="text-sm text-muted-foreground hover:text-primary transition-colors font-serif">
                  Trocas e Devoluções
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground font-serif flex items-center gap-1">
            © 2024 Mahoya. Feito com <Heart className="h-3 w-3 text-accent fill-accent" /> para momentos especiais.
          </p>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent animate-sparkle" />
            <span className="text-sm text-muted-foreground font-serif">Magia Feita a Dois</span>
            <Sparkles className="h-4 w-4 text-accent animate-sparkle" />
          </div>
        </div>
      </div>
    </footer>
  );
};
