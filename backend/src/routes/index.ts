import { Router } from "express";
import authRoutes from "./auth.routes";
import clientRoutes from "./client.routes";
import sectorRoutes from "./sector.routes";
import serviceRoutes from "./service.routes";
import appointmentRoutes from "./appointment.routes";
import dashboardRoutes from "./dashboard.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/clients", clientRoutes);
router.use("/sectors", sectorRoutes);
router.use("/services", serviceRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
