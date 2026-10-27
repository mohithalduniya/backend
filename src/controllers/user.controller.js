import UserModel from "../models/user.model.js";
import { generateOtp, generateToken, getOtpExpire } from "../utils/helper.js";
import {
  sendBadRequest,
  sendConflict,
  sendServerError,
  sendSuccess,
} from "../utils/response.js";
import sendOtpMail from "../utils/sendOtpMail.js";

const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while logging out.",
    });
  }
};

export { logout };

export const getMe = async (req, res) => {
  try {
    const user = req.user;
    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      user,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, mobile, addresses } = req.body;
    const user = await UserModel.findById(req.user._id);
    if (!user) return sendBadRequest(res, "User not found");

    if (name) user.name = name.trim();
    if (mobile) user.mobile = mobile.trim();
    if (addresses && Array.isArray(addresses)) user.addresses = addresses;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password)
      return sendBadRequest(res, "Name, email and password are required");

    const normalizedEmail = email.toLowerCase().trim();

    // Check existing user
    const existingUser = await UserModel.findOne({ email: normalizedEmail });

    // Already verified user
    if (existingUser && existingUser.isVerified)
      return sendConflict(res, "Email already registered");

    // Generate OTP
    const otp = generateOtp();
    const otpExpire = getOtpExpire();

    // Save user FIRST so data is never lost if the email fails
    let user;
    if (existingUser) {
      existingUser.name = name;
      existingUser.password = password; // Should hash in real app
      existingUser.otp = otp;
      existingUser.otpExpire = otpExpire;
      await existingUser.save();
      user = existingUser;
    } else {
      user = await UserModel.create({
        name,
        email: normalizedEmail,
        password, // Should hash in real app
        isVerified: false,
        otp,
        otpExpire,
      });
    }

    // Then try to send the OTP email
    const emailResult = await sendOtpMail(user.email, otp);

    return res.status(201).json({
      success: true,
      emailSent: emailResult.success,
      message: emailResult.success
        ? "Registration successful. Please verify OTP."
        : "Account created but OTP email failed. Please tap Resend OTP.",
      email: user.email,
    });
  } catch (error) {
    console.error("Register Error:", error);
    return sendServerError(res);
  }
};

export const verifyRegisterOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp)
      return sendBadRequest(res, "Email and Otp are required");
    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) return sendConflict(res, "User not found");
    // Already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Account already verified",
      });
    }

    // OTP check
    if (Number(otp) !== Number(user.otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Expiry check
    if (user.otpExpire < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Verify account
    user.isVerified = true;

    // Remove OTP after successful verification
    user.otp = undefined;
    user.otpExpire = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Account verified successfully",
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const resendRegisterOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      return sendBadRequest(res, "Email is required");
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await UserModel.findOne({
      email: normalizedEmail,
    });

    // User not found
    if (!user) {
      return sendBadRequest(res, "User not found");
    }

    // Already verified
    if (user.isVerified) {
      return sendConflict(res, "Account already verified");
    }

    // Generate new OTP and save it first
    const otp = generateOtp();
    const otpExpire = getOtpExpire();

    user.otp = otp;
    user.otpExpire = otpExpire;
    await user.save();

    // Send OTP email
    const emailResult = await sendOtpMail(normalizedEmail, otp);

    if (!emailResult.success) {
      return res.status(502).json({
        success: false,
        message: "Could not send OTP email right now. Please try again later.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "OTP resent successfully",
      email: user.email,
    });
  } catch (error) {
    console.error("Resend OTP Error:", error);

    return sendServerError(res);
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Validation
    if (!email || !password)
      return sendBadRequest(res, "Email and password are required");

    // Check existing user
    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user)
      return sendConflict(res, "Account not found. Please create an account");
    if (!user.isVerified)
      return sendConflict(res, "Please verify your account OTP first");

    if (user.password !== password)
      return sendBadRequest(res, "Incorrect password");

    if (user.status === false) {
      return res.status(403).json({
        success: false,
        message: "Your account is deactivated. Please contact support.",
      });
    }

    const token = generateToken(user);
    res.cookie("token", token, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      mobile: user.mobile,
      addresses: user.addresses || [],
    };

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: userData,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return sendBadRequest(res, "Email and password are required");

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) return sendBadRequest(res, "Invalid email or password");
    if (user.password !== password)
      return sendBadRequest(res, "Invalid email or password");

    if (user.role !== "admin" && user.role !== "superAdmin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only administrator accounts can sign in here.",
      });
    }

    if (user.status === false) {
      return res.status(403).json({
        success: false,
        message: "Admin account is deactivated.",
      });
    }

    const token = generateToken(user);
    res.cookie("token", token, {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      mobile: user.mobile,
    };

    return res.status(200).json({
      success: true,
      message: "Admin login successful",
      token,
      user: userData,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

export const seedAdmin = async (req, res) => {
  try {
    const adminEmail = "admin@nestro.com";
    let admin = await UserModel.findOne({ email: adminEmail });

    if (admin) {
      admin.role = "admin";
      admin.isVerified = true;
      admin.password = "admin123";
      await admin.save();
      return res.status(200).json({
        success: true,
        message: "Admin account already exists and updated to admin role",
        email: adminEmail,
        role: admin.role,
        credentials: "email: admin@nestro.com, password: admin123",
      });
    }

    admin = await UserModel.create({
      name: "Nestro Admin",
      email: adminEmail,
      password: "admin123",
      role: "admin",
      isVerified: true,
      status: true,
    });

    return res.status(201).json({
      success: true,
      message: "Default admin account created successfully",
      email: adminEmail,
      role: admin.role,
      credentials: "email: admin@nestro.com, password: admin123",
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

export const setRole = async (req, res) => {
  try {
    const { email, role } = req.body;
    if (!email || !role)
      return sendBadRequest(res, "Email and role are required");

    const validRoles = ["user", "admin", "superAdmin"];
    if (!validRoles.includes(role)) {
      return sendBadRequest(
        res,
        `Invalid role. Allowed roles: ${validRoles.join(", ")}`,
      );
    }

    const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
    if (!user)
      return sendBadRequest(res, `User with email '${email}' not found`);

    user.role = role;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User '${user.email}' role has been updated to '${role}'`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};
