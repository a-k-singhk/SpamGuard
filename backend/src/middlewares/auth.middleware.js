import { User } from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';

export const verifyJwt = asyncHandler(async (req, _, next) => {
    // Retrieve token from either cookies or authorization header
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(401, "Unauthorized request: No token provided");
    }

    try {
        // Decode and verify the JWT
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Find the user associated with the token
        const user = await User.findById(decodedToken._id).select("-password -refreshToken");

        if (!user) {
            throw new ApiError(401, "Unauthorized: User not found or token invalid");
        }

        // Attach user to request for access in route controllers
        req.user = user;
        next();
    } catch (error) {
        // Catching specific JWT errors for better feedback
        if (error.name === "TokenExpiredError") {
            throw new ApiError(401, "Session expired. Please log in again.");
        } else if (error.name === "JsonWebTokenError") {
            throw new ApiError(401, "Invalid token. Authentication failed.");
        } else {
            throw new ApiError(401, error.message || "Unauthorized: Access token is invalid");
        }
    }
});
