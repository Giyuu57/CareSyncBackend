import { Router } from "express";
import { register, login, forgotPassword, resetPassword } from "../controllers/authController.js";
const router = Router();

router.route("/login").post(login);
router.route("/register").post(register);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password").post(resetPassword);

export default router;