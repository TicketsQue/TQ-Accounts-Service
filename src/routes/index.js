import { Router } from "express";
import infoRouter from "./info.js";
import customerRouter from "./customer.js";
import staffRouter from "./staff.js";

const router = Router();

// info routes for vendor account information related end-points
router.use(infoRouter);
// customer routes for customer(users who search and buy tickets from TicketsQue) related end-points
router.use(customerRouter);
router.use(staffRouter);

export default router;
