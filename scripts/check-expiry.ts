import assert from "node:assert/strict";
import { Option } from "effect";
import { HOUR_MS, isExpired, type FileTimes } from "../src/services/FileExpiry.js";

const ttlMs = 24 * HOUR_MS;
const now = Date.now();

const hoursAgo = (h: number) => new Date(now - h * HOUR_MS);

const withBirthtime = (d: Date, mtime?: Date): FileTimes => ({
  birthtime: Option.some(d),
  mtime: Option.fromNullable(mtime ?? d),
});

const withMtimeOnly = (d: Date): FileTimes => ({
  birthtime: Option.none(),
  mtime: Option.some(d),
});

// birthtime now-23h => not expired
assert.equal(isExpired(withBirthtime(hoursAgo(23)), now, ttlMs), false);

// birthtime now-24h exact boundary => expired (>=)
assert.equal(isExpired(withBirthtime(hoursAgo(24)), now, ttlMs), true);

// birthtime now-25h => expired
assert.equal(isExpired(withBirthtime(hoursAgo(25)), now, ttlMs), true);

// birthtime none + mtime now-25h => expired (fallback to mtime)
assert.equal(isExpired(withMtimeOnly(hoursAgo(25)), now, ttlMs), true);

// birthtime none + mtime now-1h => not expired
assert.equal(isExpired(withMtimeOnly(hoursAgo(1)), now, ttlMs), false);

// birthtime Option.some(epoch 0) + mtime now-1h => NOT expired (epoch guard:
// a zero birthtime means "unknown", must fall back to mtime, which is recent)
assert.equal(
  isExpired(
    { birthtime: Option.some(new Date(0)), mtime: Option.some(hoursAgo(1)) },
    now,
    ttlMs,
  ),
  false,
);

// both none => unknown age, never expired
assert.equal(
  isExpired({ birthtime: Option.none(), mtime: Option.none() }, now, ttlMs),
  false,
);

console.log("check-expiry: all assertions passed");
