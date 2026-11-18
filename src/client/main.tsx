// Client entry point: i18n init + theme CSS + router.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './i18n';
import './styles/theme.css';
import App from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('HK F&B RADAR: #root element not found in index.html');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
