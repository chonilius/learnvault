import { Router } from "express"
import {
	getTreasuryActivity,
	getTreasuryStats,
} from "../controllers/treasury.controller"
 
const router = Router()
 
router.get("/treasury/stats", getTreasuryStats)
router.get("/treasury/activity", getTreasuryActivity)
 
export { router as treasuryRouter }
