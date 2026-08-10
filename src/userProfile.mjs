import { getProfile, putProfile } from "./db.mjs";

export function loadProfile(userId) {
  return getProfile(userId);
}

export function saveProfile(userId, loginUserId, { nombre, edad, sexo, ubicacion }) {
  putProfile(userId, loginUserId, { nombre, edad, sexo, ubicacion });
}
