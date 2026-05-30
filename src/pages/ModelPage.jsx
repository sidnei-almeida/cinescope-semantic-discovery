import ModelSection from "../components/ModelSection.jsx";
import DataSection from "../components/DataSection.jsx";

export default function ModelPage() {
  return (
    <div className="page-enter">
      <main className="site-main site-main--subpage">
        <ModelSection />
        <DataSection />
      </main>
    </div>
  );
}
