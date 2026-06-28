import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import publicRouter from "./public";
import membersRouter from "./members";
import fnbRouter from "./fnb";
import employeesRouter from "./employees";
import supervisorRouter from "./supervisor";
import agentRouter from "./agent";
import channelsRouter from "./channels";
import realtimeRouter from "./realtime";
import pushRouter from "./push";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(publicRouter);
router.use(membersRouter);
router.use(fnbRouter);
router.use(employeesRouter);
router.use(supervisorRouter);
router.use(agentRouter);
router.use(channelsRouter);
router.use(realtimeRouter);
router.use(pushRouter);
router.use(notificationsRouter);

export default router;
