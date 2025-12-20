import { Layout } from '@/components/layout/Layout';
import { AboutSection } from '@/components/home/AboutSection';
import { BenefitsSection } from '@/components/home/BenefitsSection';

const Sobre = () => (
  <Layout>
    <div className="py-8">
      <h1 className="font-script text-4xl md:text-5xl text-primary text-center mb-4">         </h1>
      <AboutSection />
      <BenefitsSection />
    </div>
  </Layout>
);

export default Sobre;
