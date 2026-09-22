import express from "express";
import cors from "cors";
import { env } from "./config/env";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";

export const app = express();

app.use(cors({ origin: env.frontendUrl }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok", service: "iris-backend" }));

app.use("/api", routes);

app.use(errorHandler);
