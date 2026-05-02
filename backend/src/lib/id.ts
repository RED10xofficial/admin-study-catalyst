import { nanoid } from 'nanoid';

export function generateId(): string {
  return nanoid();
}

export function now(): string {
  return new Date().toISOString();
}
