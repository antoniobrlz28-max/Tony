import { uid, todayStr } from "./id.js";

export function getDishPhotos(data, dishId) {
  return (data.dishPhotos?.[dishId] || []).slice().sort((a, b) => b.date.localeCompare(a.date));
}

export function addDishPhoto(draft, dishId, { url, caption = "" }) {
  draft.dishPhotos = draft.dishPhotos || {};
  draft.dishPhotos[dishId] = draft.dishPhotos[dishId] || [];
  draft.dishPhotos[dishId].push({ id: uid("photo"), url, caption, date: todayStr() });
}

export function removeDishPhoto(draft, dishId, photoId) {
  if (!draft.dishPhotos?.[dishId]) return;
  draft.dishPhotos[dishId] = draft.dishPhotos[dishId].filter((p) => p.id !== photoId);
}
