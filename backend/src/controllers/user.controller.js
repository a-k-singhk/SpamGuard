import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Contact } from "../models/contact.model.js";
import mongoose from 'mongoose';
import jwt from "jsonwebtoken";

// Generate Access and Refresh Tokens
const generateTokens = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
};

// Register New User
const registerUser = asyncHandler(async (req, res) => {
    const { name, phone, email, password } = req.body;
    if (!name || !phone || !password) throw new ApiError(400, "Name, phone, and password are required");

    const existingUser = await User.findOne({ $or: [{ phone }, { email }] });
    if (existingUser) throw new ApiError(409, "User with this phone or email already exists");

    const user = await User.create({ name, phone, email, password });

    const contacts = req.body.contacts || [];
    for (const contact of contacts) {
        await Contact.create({ ...contact, owner: user._id });
    }

    const userDetails = await User.findById(user._id).select("-password -refreshToken");
    return res.status(201).json(new ApiResponse(201, userDetails, "User registered successfully"));
});

// User Login
const loginUser = asyncHandler(async (req, res) => {
    const { email, phone, password } = req.body;
    if (!phone && !email) throw new ApiError(400, "Phone or email is required");

    const user = await User.findOne({ $or: [{ email }, { phone }] });
    if (!user) throw new ApiError(404, "User does not exist");

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

    const { accessToken, refreshToken } = await generateTokens(user._id);
    const userData = await User.findById(user._id).select("-password -refreshToken");

    return res.status(200)
       .cookie("accessToken", accessToken, { httpOnly: true, secure: true })
       .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true })
       .json(new ApiResponse(200, { user: userData, accessToken, refreshToken }, "Login successful"));
});

// User Logout
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });
    return res.status(200)
       .clearCookie("accessToken", { httpOnly: true, secure: true })
       .clearCookie("refreshToken", { httpOnly: true, secure: true })
       .json(new ApiResponse(200, {}, "Logout successful"));
});

// Refresh Access Token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) throw new ApiError(401, "Unauthorized request");

    const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded._id);
    if (!user || user.refreshToken !== incomingRefreshToken) throw new ApiError(401, "Invalid refresh token");

    const { accessToken, refreshToken } = await generateTokens(user._id);
    return res.status(200)
       .cookie("accessToken", accessToken, { httpOnly: true, secure: true })
       .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true })
       .json(new ApiResponse(200, { accessToken, refreshToken }, "Token refreshed"));
});

// Mark Phone Number as Spam
const markSpam = asyncHandler(async (req, res) => {
    const { phone } = req.body;
    if (!phone) throw new ApiError(400, "Phone number is required");

    let contact = await Contact.findOne({ phone });
    if (!contact) {
        contact = await Contact.create({ phone, spam: true, name: "Unknown", owner: req.user._id });
    } else {
        contact.spam = true;
        await contact.save();
    }

    return res.status(200).json(new ApiResponse(200, contact, "Number marked as spam"));
});

// Search by Name or Phone Number
const search = asyncHandler(async (req, res) => {
    const { query } = req.query;
    if (!query) {
        throw new ApiError(400, "Search Query is required");
    }

    const regex = new RegExp(query, "i"); // Case-insensitive search

    // Searching for users by name
    const usersByName = await User.find({ name: regex }).select("name phone spam");

    // Searching for users by phone number
    const usersByPhone = await User.find({ phone: regex }).select("name phone spam");

    // Combine results, ensuring unique entries
    const results = [...new Set([...usersByName, ...usersByPhone])];

    return res.status(200).json(new ApiResponse(200, results, "Search results retrieved successfully"));
});


// Get Contact Details with Conditional Email Visibility
const getUserDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    // For debugging
    console.log("Requested Contact ID:", id); 

    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new ApiError(400, "Invalid contact ID format");
    }

    const contact = await Contact.findById(id).populate("owner", "email name phone");

    if (!contact) {
        throw new ApiError(404, "Contact not found");
    }

    let email = null;
    if (contact.owner && contact.owner.email) {
        const isInContactList = await Contact.exists({
            owner: contact.owner._id,
            phone: req.user.phone
        });

        if (isInContactList) {
            email = contact.owner.email;
        }
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                name: contact.name,
                phone: contact.phone,
                spam: contact.spam,
                email
            },
            "Contact details retrieved"
        )
    );
});


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    markSpam,
    search,
    getUserDetails
};
