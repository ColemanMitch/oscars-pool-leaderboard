import { Routes, Route } from "react-router-dom";
import Leaderboard from "./components/Leaderboard";
import AdminPanel from "./components/AdminPanel";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Leaderboard />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  );
}
