import { useState } from "react";
import TermPopup from "./TermPopup.jsx";

// Renders a dish's parsed components as clickable chips — tap one to see
// what it is without leaving the screen. Used anywhere a menu item's
// ingredient list is shown (Current Menu, dish page, etc).
export default function IngredientTerms({ components, dictionary = {} }) {
  const [openTerm, setOpenTerm] = useState(null);
  if (!components || components.length === 0) return null;
  return (
    <>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
        {components.map((c, i) => (
          <span
            key={i}
            className="pill neutral clickable"
            onClick={(e) => {
              e.stopPropagation();
              setOpenTerm(c.normalized);
            }}
          >
            {c.normalized}
          </span>
        ))}
      </div>
      {openTerm && (
        <TermPopup term={openTerm} entry={dictionary[openTerm]} onClose={() => setOpenTerm(null)} />
      )}
    </>
  );
}
