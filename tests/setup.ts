import { mock } from "bun:test";

// Mock 'server-only' so tests can run outside of Next.js Webpack bundler
mock.module("server-only", () => ({}));

