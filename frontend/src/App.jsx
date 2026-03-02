import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Skills from "./pages/Skills";
import Agents from "./pages/Agents";
import Chat from "./pages/Chat";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/chat/:agentId" element={<Chat />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
