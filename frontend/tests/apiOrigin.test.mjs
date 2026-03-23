import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAuthenticatedApiUrl,
  DEFAULT_LOCAL_API_ORIGIN,
  LEGACY_LOCAL_API_ORIGIN,
  resolveApiOrigin,
} from "../src/utils/apiOrigin.ts";

test("api origin prefers explicit configured origin", () => {
  assert.equal(
    resolveApiOrigin({
      configuredOrigin: "http://127.0.0.1:43800/",
      port: "43173",
    }),
    DEFAULT_LOCAL_API_ORIGIN
  );
});

test("api origin maps known high frontend ports to the current local backend", () => {
  assert.equal(resolveApiOrigin({ port: "43173" }), DEFAULT_LOCAL_API_ORIGIN);
  assert.equal(resolveApiOrigin({ port: "43174" }), DEFAULT_LOCAL_API_ORIGIN);
  assert.equal(resolveApiOrigin({ port: "49173" }), DEFAULT_LOCAL_API_ORIGIN);
});

test("api origin falls back to legacy localhost backend for other ports", () => {
  assert.equal(resolveApiOrigin({ port: "5173" }), LEGACY_LOCAL_API_ORIGIN);
  assert.equal(resolveApiOrigin({ port: "" }), LEGACY_LOCAL_API_ORIGIN);
});

test("authenticated api url appends token for raw media playback", () => {
  assert.equal(
    buildAuthenticatedApiUrl({
      path: "/api/music/files/music_123",
      token: "token-abc",
      configuredOrigin: "http://127.0.0.1:43800/",
      port: "43173",
    }),
    "http://127.0.0.1:43800/api/music/files/music_123?token=token-abc"
  );
});
