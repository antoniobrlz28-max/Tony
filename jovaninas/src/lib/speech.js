// Pronunciation playback via the browser's built-in speech synthesis (no
// API key, no network call). `language` should reflect the language of the
// text actually being spoken — most dictionary terms are Italian loanwords
// used as-is (mostarda, nduja, burrata...), so those get an Italian voice
// and accent; entries whose `term` is an English descriptive phrase (e.g.
// "black garlic", "preserved lemon") stay in English regardless of the
// ingredient's origin, since that's the text being read aloud.

const LANG_TAGS = { it: "it-IT", es: "es-ES", fr: "fr-FR", ar: "ar-SA", en: "en-US" };

let voicesPromise = null;

function loadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return Promise.resolve([]);
  if (voicesPromise) return voicesPromise;
  voicesPromise = new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length) return resolve(existing);
    const handler = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 400);
  });
  return voicesPromise;
}

async function pickVoice(langTag) {
  const voices = await loadVoices();
  const prefix = langTag.split("-")[0].toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase() === langTag.toLowerCase()) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
    null
  );
}

// language: 'it' | 'en' | 'es' | 'fr' | 'ar' (defaults to Italian, since
// that's the majority of this dictionary)
export async function speakTerm(text, language = "it") {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
  const langTag = LANG_TAGS[language] || LANG_TAGS.it;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = langTag;
  utter.rate = 0.82;
  const voice = await pickVoice(langTag);
  if (voice) utter.voice = voice;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

// Surfaces whether an actual Italian voice is installed, so the UI can be
// honest when it's falling back to a default voice + lang tag only.
export async function hasItalianVoice() {
  const voices = await loadVoices();
  return voices.some((v) => v.lang.toLowerCase().startsWith("it"));
}
