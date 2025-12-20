import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { BenefitsSection } from '@/components/home/BenefitsSection';
import { CategoriesSection } from '@/components/home/CategoriesSection';
import { TestimonialsSection } from '@/components/home/TestimonialsSection';
import { PromoPopups } from '@/components/home/PromoPopups';

const Index = () => {
  return (
    <Layout>
      <PromoPopups />

      <HeroSection />
      <BenefitsSection />
      <CategoriesSection />
      <TestimonialsSection />
    </Layout>
  );
};

export default Index;
