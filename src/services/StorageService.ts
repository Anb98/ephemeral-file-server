import { Effect, Context, Layer } from "effect";
import { FileSystem } from "@effect/platform";
import * as path from "node:path";
import * as crypto from "node:crypto";
import * as fsPromises from "node:fs/promises";
import { ServerConfig } from "../config.js";

export interface StorageService {
  readonly saveFile: (
    sourceFilePath: string,
    originalName: string,
  ) => Effect.Effect<string, unknown>;
  readonly getAndRemoveImage: (
    id: string,
  ) => Effect.Effect<{ buffer: Uint8Array; contentType: string }, unknown>;
}

export const StorageService = Context.GenericTag<StorageService>(
  "@services/StorageService",
);

export const StorageServiceLive = Layer.effect(
  StorageService,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const config = yield* ServerConfig;

    // Ensure upload dir exists
    yield* fs
      .makeDirectory(config.uploadDir, { recursive: true })
      .pipe(Effect.catchAll(() => Effect.void));

    return StorageService.of({
      saveFile: (sourceFilePath: string, originalName: string) =>
        Effect.gen(function* () {
          const id = crypto.randomUUID();
          const extension = path.extname(originalName);
          const finalPath = path.join(config.uploadDir, `${id}${extension}`);

          // Move file from temp dir to our upload dir (copy + remove to avoid EXDEV)
          yield* Effect.tryPromise({
            try: () => fsPromises.copyFile(sourceFilePath, finalPath),
            catch: (error) => new Error(`Failed to copy file: ${error}`),
          });
          yield* fs.remove(sourceFilePath);
          return id;
        }),

      getAndRemoveImage: (id: string) =>
        Effect.gen(function* () {
          const files = yield* fs.readDirectory(config.uploadDir);
          const filename = files.find((f) => f.startsWith(id + "."));

          if (!filename) {
            return yield* Effect.fail(new Error("Image not found"));
          }

          const filepath = path.join(config.uploadDir, filename);
          const buffer = yield* fs.readFile(filepath);

          // Delete it after reading to ensure ephemeral nature
          yield* fs.remove(filepath);

          const contentType = filename.toLowerCase().endsWith(".png")
            ? "image/png"
            : filename.toLowerCase().endsWith(".gif")
              ? "image/gif"
              : filename.toLowerCase().endsWith(".webp")
                ? "image/webp"
                : "image/jpeg";

          return { buffer, contentType };
        }),
    });
  }),
);
