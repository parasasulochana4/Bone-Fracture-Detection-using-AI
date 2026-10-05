import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import HomePage from '@/pages/HomePage';
import DiagnosisPage from '@/pages/DiagnosisPage';
import ModelsPage from '@/pages/ModelsPage';
import BenchmarkPage from '@/pages/BenchmarkPage';
import DemoPage from '@/pages/DemoPage';
import TreatmentPlanPage from '@/pages/TreatmentPlanPage';
import AIConsultationPage from '@/pages/AIConsultationPage';
import ExplainabilityPage from '@/pages/ExplainabilityPage';
import DocsPage from '@/pages/DocsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/diagnosis" element={<DiagnosisPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/benchmark" element={<BenchmarkPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/treatment" element={<TreatmentPlanPage />} />
          <Route path="/consultation" element={<AIConsultationPage />} />
          <Route path="/explainability" element={<ExplainabilityPage />} />
          <Route path="/docs" element={<DocsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
