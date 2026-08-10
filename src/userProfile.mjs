import { getProfile, putProfile } from "./db.mjs";

export function loadProfile(userId) {
  return getProfile(userId);
}

export function saveProfile(userId, { nombre, edad, sexo, ubicacion }) {
  putProfile(userId, { nombre, edad, sexo, ubicacion });
}
