import { Effect, Layer, Option, Schedule } from "effect";
import { FileSystem } from "@effect/platform";
import * as path from "node:path";
import { ServerConfig } from "../config.js";

export const HOUR_MS = 3_600_000;
const SWEEP_INTERVAL_MS = HOUR_MS;

/** Structural, not FileSystem.File.Info, so the check script can call it with
 *  plain object literals. File.Info satisfies it. */
export interface FileTimes {
  readonly birthtime: Option.Option<Date>;
  readonly mtime: Option.Option<Date>;
}

/** A non-positive timestamp means the filesystem does not know: libuv reports
 *  birthtime 0 where the kernel has no btime. */
const realMs = (o: Option.Option<Date>): number | undefined => {
  const ms = Option.isSome(o) ? o.value.getTime() : 0;
  return Number.isFinite(ms) && ms > 0 ? ms : undefined;
};

export const createdAtMs = (t: FileTimes): number | undefined =>
  realMs(t.birthtime) ?? realMs(t.mtime);

/** Pure. Undeterminable age is never expired. */
export const isExpired = (
  t: FileTimes,
  nowMs: number,
  ttlMs: number,
): boolean => {
  const created = createdAtMs(t);
  return created !== undefined && nowMs - created >= ttlMs;
};

const sweepOnce = (fs: FileSystem.FileSystem, dir: string, ttlMs: number) =>
  Effect.gen(function* () {
    const now = Date.now();
    const files = yield* fs.readDirectory(dir);
    let removed = 0;
    for (const name of files) {
      const p = path.join(dir, name);
      // per-file trap: tolerates the read-vs-sweep ENOENT race and permission errors
      const info = yield* fs
        .stat(p)
        .pipe(Effect.catchAll(() => Effect.succeed(null)));
      if (info === null || info.type !== "File" || !isExpired(info, now, ttlMs))
        continue;
      const ok = yield* fs
        .remove(p)
        .pipe(Effect.as(true), Effect.catchAll(() => Effect.succeed(false)));
      if (ok) removed += 1;
    }
    yield* Effect.log(`expiry sweep: ${files.length} scanned, ${removed} removed`);
  }).pipe(
    // sweep-level trap: readDirectory failure (missing uploadDir) must not kill the fiber
    Effect.catchAll((error) => Effect.logError(`expiry sweep failed: ${error}`)),
  );

export const FileExpiryLive = Layer.scopedDiscard(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const config = yield* ServerConfig;
    const ttlMs = config.ttlHours * HOUR_MS;
    // clamped so a sub-hour TTL is still swept promptly, and so the sweeper is
    // observable in a short manual run
    const interval = Math.min(SWEEP_INTERVAL_MS, ttlMs);
    yield* Effect.forkScoped(
      sweepOnce(fs, config.uploadDir, ttlMs).pipe(
        Effect.repeat(Schedule.spaced(interval)),
      ),
    );
  }),
);
