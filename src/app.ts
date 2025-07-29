import express, { Application, Request, Response } from "express";
import { usersRoutes } from "./app/controllers/user.controller";
import cors from "cors";
import { companyRoutes } from "./app/controllers/company.controller";
import { productRoutes } from "./app/controllers/product.controller";
import { purchaseRoutes } from "./app/controllers/purchase.controller";
import { storeRoutes } from "./app/controllers/store.controller";
import { saleRoutes } from "./app/controllers/sales.controller";
import { invoiceRoutes } from "./app/controllers/invoice.controller";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { guideRoutes } from "./app/controllers/guide.controller";

const app: Application = express();

app.use(cors());

app.use(express.json());

app.use("/api/users", usersRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/product", productRoutes);
app.use("/api/purchase", purchaseRoutes);
app.use("/api/store", storeRoutes);
app.use("/api/sale", saleRoutes);
app.use("/api/invoice", invoiceRoutes);
app.use("/api/guide", guideRoutes);

app.use(globalErrorHandler);

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Gazi tiles");
});

export default app;

// mvc - model  , controller
