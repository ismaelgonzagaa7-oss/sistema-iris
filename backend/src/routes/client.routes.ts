import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  listClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
} from "../controllers/client.controller";

const router = Router();

router.use(authenticate);
router.get("/", listClients);
router.get("/:id", getClient);
router.post("/", createClient);
router.put("/:id", updateClient);
router.delete("/:id", deleteClient);

export default router;
