import { Router } from "express";
import { authenticate } from "../middleware/auth";
import {
  listAppointments,
  getAppointment,
  createAppointment,
  confirmAppointment,
  startAppointment,
  completeAppointment,
  cancelAppointment,
  rescheduleAppointment,
} from "../controllers/appointment.controller";

const router = Router();
router.use(authenticate);

router.get("/", listAppointments);
router.get("/:id", getAppointment);
router.post("/", createAppointment);
router.post("/:id/confirm", confirmAppointment);
router.post("/:id/start", startAppointment);
router.post("/:id/complete", completeAppointment);
router.post("/:id/cancel", cancelAppointment);
router.post("/:id/reschedule", rescheduleAppointment);

export default router;
