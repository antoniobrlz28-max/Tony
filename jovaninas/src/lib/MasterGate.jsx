import { Lock } from "lucide-react";
import { useData } from "./context.jsx";

// Wrap any edit-only section of a screen in this. Read-only viewers see a
// calm placeholder instead of the controls; master sees children as normal.
export default function MasterGate({ children, message = "Unlock master access on this device to make changes." }) {
  const { isMaster } = useData();
  if (isMaster) return children;
  return (
    <div className="card empty-state" style={{ padding: "22px 16px" }}>
      <Lock size={16} color="var(--gold)" />
      <p className="small" style={{ marginTop: 6 }}>{message}</p>
    </div>
  );
}
