import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth";
import { listServices, createService, updateService } from "../controllers/service.controller";

const router = Router();
router.use(authenticate);
router.get("/", listServices);
router.post("/", requireAdmin, createService);
router.put("/:id", requireAdmin, updateService);

export default router;
