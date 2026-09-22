import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { dashboardSummary } from "../controllers/dashboard.controller";

const router = Router();
router.use(authenticate);
router.get("/summary", dashboardSummary);

export default router;
