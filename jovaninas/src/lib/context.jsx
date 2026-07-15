import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { loadData, saveData } from "./storage.js";
import { buildInitialDictionary } from "./dictionary.js";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(() => {
    const loaded = loadData();
    if (!loaded.dictionary || Object.keys(loaded.dictionary).length === 0) {
      loaded.dictionary = buildInitialDictionary();
    }
    return loaded;
  });

  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    const result = saveData(data);
    setSaveError(result.ok ? null : result.message);
  }, [data]);

  // update(draft => { ...mutate draft in place... })
  const update = useCallback((mutator) => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      mutator(next);
      return next;
    });
  }, []);

  return (
    <DataContext.Provider
      value={{ data, update, setData, saveError, dismissSaveError: () => setSaveError(null) }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
