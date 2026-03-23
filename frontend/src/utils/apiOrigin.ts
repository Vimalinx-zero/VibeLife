const HIGH_PORT_FRONTEND_PORTS = new Set(["43173", "43174", "49173"]);

export const DEFAULT_LOCAL_API_ORIGIN = "http://127.0.0.1:43800";
export const LEGACY_LOCAL_API_ORIGIN = "http://localhost:8000";

export const resolveApiOrigin = ({
  configuredOrigin,
  port,
}: {
  configuredOrigin?: string | null;
  port?: string | null;
}): string => {
  const normalizedConfiguredOrigin = String(configuredOrigin || "").trim();
  if (normalizedConfiguredOrigin) {
    return normalizedConfiguredOrigin.replace(/\/+$/, "");
  }

  if (HIGH_PORT_FRONTEND_PORTS.has(String(port || "").trim())) {
    return DEFAULT_LOCAL_API_ORIGIN;
  }

  return LEGACY_LOCAL_API_ORIGIN;
};

export const buildAuthenticatedApiUrl = ({
  path,
  token,
  configuredOrigin,
  port,
}: {
  path: string;
  token?: string | null;
  configuredOrigin?: string | null;
  port?: string | null;
}): string => {
  const apiOrigin = resolveApiOrigin({ configuredOrigin, port });
  const url = new URL(path, `${apiOrigin}/`);

  if (token) {
    url.searchParams.set("token", token);
  }

  return url.toString();
};
