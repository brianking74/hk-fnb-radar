// Route table — BrowserRouter is mounted in main.tsx.
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Browse from './pages/Browse';
import Signals from './pages/Signals';
import WineSpirits from './pages/WineSpirits';
import EntityDetail from './pages/EntityDetail';
import Methodology from './pages/Methodology';
import Pricing from './pages/Pricing';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/signals" element={<Signals />} />
        <Route path="/wine-spirits" element={<WineSpirits />} />
        <Route path="/entity/:id" element={<EntityDetail />} />
        <Route path="/methodology" element={<Methodology />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
