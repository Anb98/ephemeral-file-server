import { Effect, Layer } from "effect";
import { NodeHttpServer, NodeFileSystem } from "@effect/platform-node";
import { HttpRouter, HttpServer, HttpMiddleware } from "@effect/platform";
import { createServer } from "node:http";

import { ImageRouter } from "./router.js";
import { StorageServiceLive } from "./services/StorageService.js";
import { ServerConfig } from "./config.js";

const ServerConfigLayer = Layer.effectDiscard(
  Effect.gen(function* () {
    const config = yield* ServerConfig;
    yield* Effect.log(`Starting server on ${config.host}:${config.port}`);
  }),
);

const HttpLive = NodeHttpServer.layer(createServer, {
  port: ServerConfig.pipe(
    Effect.map((c) => c.port),
    Effect.runSync,
  ),
  host: ServerConfig.pipe(
    Effect.map((c) => c.host),
    Effect.runSync,
  ),
});

// App Layer
const AppLive = ImageRouter.pipe(HttpServer.serve(HttpMiddleware.logger)).pipe(
  Layer.provide(HttpLive),
  Layer.provide(StorageServiceLive),
  Layer.provide(NodeFileSystem.layer),
);

Effect.runFork(Layer.launch(AppLive).pipe(Effect.provide(ServerConfigLayer)));
