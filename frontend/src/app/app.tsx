import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from '@/app/page';
import DashboardComponent from '@/components/dashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<DashboardComponent />} />
      </Routes>
    </Router>
  );
}
