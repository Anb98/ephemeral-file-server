import { Config } from "effect";

export const ServerConfig = Config.all({
  port: Config.number("PORT").pipe(Config.withDefault(3000)),
  host: Config.string("HOST").pipe(Config.withDefault("0.0.0.0")),
  baseUrl: Config.string("BASE_URL").pipe(
    Config.withDefault("http://localhost:3000"),
  ),
  uploadDir: Config.string("UPLOAD_DIR").pipe(Config.withDefault("./uploads")),
});
