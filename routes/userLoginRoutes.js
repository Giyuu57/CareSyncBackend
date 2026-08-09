import { Router } from "express";
import { register, login, googleLogin, forgotPassword, resetPassword } from "../controllers/authController.js";
const router = Router();

router.route("/login").post(login);
router.route("/google").post(googleLogin);
router.route("/register").post(register);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password").post(resetPassword);

export default router;