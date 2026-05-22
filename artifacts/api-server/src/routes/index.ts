import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import onboardingRouter from "./onboarding";
import tenantRouter from "./tenant";
import teamRouter from "./team";
import orgsRouter from "./orgs";
import modelsRouter from "./models";
import chatRouter from "./chat";
import analysesRouter from "./analyses";
import pipelinesRouter from "./pipelines";
import qualityRouter from "./quality";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(onboardingRouter);
router.use(tenantRouter);
router.use(teamRouter);
router.use(orgsRouter);
router.use(modelsRouter);
router.use(chatRouter);
router.use(analysesRouter);
router.use(pipelinesRouter);
router.use(qualityRouter);
router.use(dashboardRouter);

export default router;
