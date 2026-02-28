import { Effect } from "effect";
import {
  HttpRouter,
  HttpServerRequest,
  HttpServerResponse,
  Multipart,
} from "@effect/platform";
import { StorageService } from "./services/StorageService.js";
import { ServerConfig } from "./config.js";

export const ImageRouter = HttpRouter.empty.pipe(
  HttpRouter.post(
    "/upload",
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const storage = yield* StorageService;
      const config = yield* ServerConfig;

      const persisted = yield* request.multipart;
      const imageParts = persisted["image"];

      if (!imageParts) {
        return HttpServerResponse.text("No image provided or invalid format", {
          status: 400,
        });
      }

      const filePartArray = Array.isArray(imageParts)
        ? imageParts
        : [imageParts];
      const filePart = filePartArray[0];

      if (
        !filePart ||
        typeof filePart === "string" ||
        !Multipart.isPersistedFile(filePart)
      ) {
        return HttpServerResponse.text("No image provided or invalid format", {
          status: 400,
        });
      }

      const fileDataId = yield* storage.saveFile(
        filePart.path,
        filePart.name || "unknown.jpg",
      );

      return yield* HttpServerResponse.json({
        url: `${config.baseUrl}/image/${fileDataId}`,
      });
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => console.error("Upload Error:", error)),
      ),
      Effect.catchAll((error) => {
        return Effect.succeed(
          HttpServerResponse.text(
            "Server Error: " + (error as any)?.message || String(error),
            { status: 500 },
          ),
        );
      }),
    ),
  ),

  HttpRouter.get(
    "/image/:id",
    Effect.gen(function* () {
      const storage = yield* StorageService;
      const request = yield* HttpRouter.RouteContext;
      const id = request.params.id;

      if (!id) {
        return HttpServerResponse.text("Missing id", { status: 400 });
      }

      const { buffer, contentType } = yield* storage.getAndRemoveImage(id);

      return HttpServerResponse.raw(buffer).pipe(
        HttpServerResponse.setHeader("Content-Type", contentType),
      );
    }).pipe(
      Effect.catchAll(() =>
        Effect.succeed(HttpServerResponse.text("Not Found", { status: 404 })),
      ),
    ),
  ),
);
