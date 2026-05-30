import EngineSection from "../components/EngineSection.jsx";
import TechnicalSection from "../components/TechnicalSection.jsx";

export default function WorkflowPage() {
  return (
    <div className="page-enter">
      <main className="site-main site-main--subpage">
        <EngineSection />
        <TechnicalSection />
      </main>
    </div>
  );
}
