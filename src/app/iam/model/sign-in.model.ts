/** Body of `POST /api/v1/authentication/sign-in`. */
export interface SignInRequest {
  email: string;
  password: string;
}

/** Response of `POST /api/v1/authentication/sign-in` (TS14): JWT plus user data. */
export interface SignInResponse {
  id: number;
  fullName?: string;
  username?: string;
  email?: string;
  role: string;
  token: string;
}
