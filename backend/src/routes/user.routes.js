import { Router } from "express";
import { loginUser, 
    logoutUser, 
    registerUser,
    refreshAccessToken,  
    markSpam,
    search,
    getUserDetails
} from "../controllers/user.controller.js";
//import {upload} from '../middlewares/multer.middleware.js';
import { verifyJwt } from "../middlewares/auth.middleware.js";


const router=Router();

router.route("/register").post(
    registerUser)

router.route("/login").post(loginUser)

//Secure route
router.route("/logout").post(verifyJwt,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

router.route("/mark-spam").post(verifyJwt,markSpam)
router.route("/search").get(verifyJwt,search)
router.route("/contact/:id").get(verifyJwt,getUserDetails);  


export default router;