import express, { Application, Request, Response } from "express";
// import { notesRoutes } from './app/controllers/notes.controller';
// import { usersRoutes } from './app/controllers/user.controller';

const app: Application = express();

app.use(express.json());

// app.use("/notes", notesRoutes)
// app.use("/users", usersRoutes)

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Gazi tiles");
});

export default app;

// mvc - model  , controller
