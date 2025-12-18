import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { AboutSection } from '@/components/home/AboutSection';
import { CategoriesSection } from '@/components/home/CategoriesSection';
import { BenefitsSection } from '@/components/home/BenefitsSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { D20PromoSection } from '@/components/home/D20PromoSection';

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <AboutSection />
      <D20PromoSection />
      <CategoriesSection />
      <BenefitsSection />
      <TestimonialsSection />
    </Layout>
  );
};

export default Index;
