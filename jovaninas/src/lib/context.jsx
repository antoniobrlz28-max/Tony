import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { loadData, saveData } from "./storage.js";
import { buildInitialDictionary } from "./dictionary.js";
import { hashPin, verifyPin } from "./masterLock.js";

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [data, setData] = useState(() => {
    const loaded = loadData();
    if (!loaded.dictionary || Object.keys(loaded.dictionary).length === 0) {
      loaded.dictionary = buildInitialDictionary();
    }
    return loaded;
  });

  // Unlock state lives outside persisted data on purpose — it resets to
  // locked on every fresh load/reload of the device, so handing a tablet
  // back to the front-of-house after editing doesn't leave it unlocked.
  const [unlocked, setUnlocked] = useState(false);
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

  const pinIsSet = Boolean(data.settings?.masterPinHash);
  // If no PIN has ever been set, the device is master by default so setup
  // isn't a chicken-and-egg problem.
  const isMaster = !pinIsSet || unlocked;

  const unlockMaster = useCallback(
    async (pin) => {
      const ok = await verifyPin(pin, data.settings?.masterPinHash);
      if (ok) setUnlocked(true);
      return ok;
    },
    [data.settings?.masterPinHash]
  );

  const lockMaster = useCallback(() => setUnlocked(false), []);

  const setMasterPin = useCallback(
    async (pin) => {
      const hash = await hashPin(pin);
      update((draft) => {
        draft.settings = draft.settings || {};
        draft.settings.masterPinHash = hash;
      });
      setUnlocked(true);
    },
    [update]
  );

  const clearMasterPin = useCallback(() => {
    update((draft) => {
      if (draft.settings) delete draft.settings.masterPinHash;
    });
    setUnlocked(false);
  }, [update]);

  return (
    <DataContext.Provider
      value={{ data, update, setData, isMaster, pinIsSet, unlockMaster, lockMaster, setMasterPin, clearMasterPin, saveError, dismissSaveError: () => setSaveError(null) }}
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
