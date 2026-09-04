import { Router, type IRouter } from "express";
import healthRouter from "./health";
import homzaRouter from "./homza";
import dashboardsRouter from "./dashboards";

const router: IRouter = Router();

router.use(healthRouter);
router.use(homzaRouter);
router.use(dashboardsRouter);

export default router;
