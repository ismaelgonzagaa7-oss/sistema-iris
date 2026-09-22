import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { listSectors } from "../controllers/sector.controller";

const router = Router();
router.use(authenticate);
router.get("/", listSectors);

export default router;
