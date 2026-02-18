import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useAppSelector } from "./store/hooks";
import { PageA } from "./pages/PageA";
import { PageB } from "./pages/PageB";

function Layout() {
  const tabId = useAppSelector((state) => state.context.tabId);

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
      <h1>Cross-Tab Widget Prototype</h1>
      <nav style={{ marginBottom: 24, display: "flex", gap: 16 }}>
        <Link to="/a">Page A (Publishers)</Link>
        <Link to="/b">Page B (Subscribers)</Link>
      </nav>
      <p style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>
        Tab ID: <code>{tabId}</code>
      </p>
      <Routes>
        <Route path="/a" element={<PageA />} />
        <Route path="/b" element={<PageB />} />
        <Route
          path="*"
          element={
            <p>
              Select <Link to="/a">Page A</Link> or <Link to="/b">Page B</Link>{" "}
              to get started.
            </p>
          }
        />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}
