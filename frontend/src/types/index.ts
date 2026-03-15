export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  username?: string;
}

export interface ThemeProfile {
  name: string;
  avatar: string;
  email: string;
  theme: "light" | "dark" | "system";
}
