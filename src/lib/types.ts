export type ClassValue =
  | string
  | number
  | null
  | boolean
  | undefined
  | ClassValue[]
  | Record<string, boolean | null | undefined>;

export interface SessionUser {
  id: string;
  name: string;
  fullName: string;
  email: string;
  role: string;
  username: string;
}
