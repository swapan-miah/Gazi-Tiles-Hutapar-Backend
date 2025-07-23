import express, { Application, Request, Response } from "express";
import { usersRoutes } from "./app/controllers/user.controller";
import cors from "cors";
import { companyRoutes } from "./app/controllers/company.controller";

const app: Application = express();

app.use(cors());

app.use(express.json());

app.use("/api/users", usersRoutes);
app.use("/api/company", companyRoutes);

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Gazi tiles");
});

export default app;

// mvc - model  , controller
