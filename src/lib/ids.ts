import { customAlphabet } from "nanoid";

// Bezpieczny alfabet URL: małe/wielkie litery i cyfry bez znaków problematycznych w adresach.
const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const nano = customAlphabet(ALPHABET, 16);

/** Nazwa losowego pliku na dysku (bez rozszerzenia) dla dokumentów sprawy. */
export function newStoredFileName(): string {
  return nano();
}
