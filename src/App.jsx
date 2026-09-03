import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import DiscoverPage from "./pages/DiscoverPage.jsx";
import ModelPage from "./pages/ModelPage.jsx";
import DataPage from "./pages/DataPage.jsx";
import WorkflowPage from "./pages/WorkflowPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";

/**
 * The semantic engine used to live on a free Render dyno, so the app opened
 * behind a full-screen health-check curtain that could last a minute. It now
 * runs as a serverless function next to this bundle and answers in ~40 ms, so
 * the app renders straight away and each section loads its own skeleton.
 */
export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DiscoverPage />} />
          <Route path="model" element={<ModelPage />} />
          <Route path="data" element={<DataPage />} />
          <Route path="workflow" element={<WorkflowPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
