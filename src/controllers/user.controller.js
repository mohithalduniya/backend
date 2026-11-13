import UserModel from "../models/user.model.js";
import { generateOtp, generateToken, getOtpExpire } from "../utils/helper.js";
import {
  sendBadRequest,
  sendConflict,
  sendServerError,
  sendSuccess,
} from "../utils/response.js";
import sendOtpMail from "../utils/sendOtpMail.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const MAX_OTP_ATTEMPTS = 5;
const OTP_VALIDITY_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;

// Single source of truth so login and logout always use identical cookie options
// (a cookie can only be cleared with the same attributes it was set with).
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
});

const logout = async (req, res) => {
  try {
    res.clearCookie("token", cookieOptions());

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

    if (String(password).length < 8)
      return sendBadRequest(res, "Password must be at least 8 characters");

    const normalizedEmail = email.toLowerCase().trim();

    // Check existing user
    const existingUser = await UserModel.findOne({ email: normalizedEmail });

    // Already verified user
    if (existingUser && existingUser.isVerified)
      return sendConflict(res, "Email already registered");

    // Generate OTP
    const otp = generateOtp();
    const otpExpire = getOtpExpire();

    const hashedPassword = await hashPassword(password);

    // Save user FIRST so data is never lost if the email fails
    let user;
    if (existingUser) {
      existingUser.name = name.trim();
      existingUser.password = hashedPassword;
      existingUser.otp = otp;
      existingUser.otpExpire = otpExpire;
      existingUser.otpAttempts = 0;
      await existingUser.save();
      user = existingUser;
    } else {
      user = await UserModel.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        isVerified: false,
        otp,
        otpExpire,
        otpAttempts: 0,
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

    if (!user.otp || !user.otpExpire) {
      return sendBadRequest(res, "No OTP requested. Please resend OTP.");
    }

    // Expiry check
    if (user.otpExpire < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please resend OTP.",
      });
    }

    // Brute-force protection: a 6-digit code must not be guessable by retrying
    if ((user.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: "Too many wrong attempts. Please resend OTP to get a new code.",
      });
    }

    // OTP check
    if (String(otp).trim() !== String(user.otp)) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Verify account
    user.isVerified = true;

    // Remove OTP after successful verification
    user.otp = undefined;
    user.otpExpire = undefined;
    user.otpAttempts = 0;

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

    // Cooldown: the OTP was issued at (otpExpire - validity). Block rapid re-sends.
    if (user.otpExpire) {
      const issuedAt = user.otpExpire.getTime() - OTP_VALIDITY_MS;
      const waitMs = RESEND_COOLDOWN_MS - (Date.now() - issuedAt);
      if (waitMs > 0) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${Math.ceil(waitMs / 1000)} seconds before requesting a new OTP.`,
        });
      }
    }

    // Generate new OTP and save it first
    const otp = generateOtp();
    const otpExpire = getOtpExpire();

    user.otp = otp;
    user.otpExpire = otpExpire;
    user.otpAttempts = 0;
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

    const check = await verifyPassword(password, user.password);
    if (!check.ok) return sendBadRequest(res, "Incorrect password");

    if (user.status === false) {
      return res.status(403).json({
        success: false,
        message: "Your account is deactivated. Please contact support.",
      });
    }

    // Upgrade legacy plain-text passwords to a hash on first successful login
    if (check.needsRehash) {
      user.password = await hashPassword(password);
      await user.save();
    }

    const token = generateToken(user);
    res.cookie("token", token, {
      ...cookieOptions(),
      maxAge: 30 * 24 * 60 * 60 * 1000,
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
    const check = await verifyPassword(password, user.password);
    if (!check.ok) return sendBadRequest(res, "Invalid email or password");

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

    if (check.needsRehash) {
      user.password = await hashPassword(password);
      await user.save();
    }

    const token = generateToken(user);
    res.cookie("token", token, {
      ...cookieOptions(),
      maxAge: 30 * 24 * 60 * 60 * 1000,
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

// One-time bootstrap of the first admin account.
// - Refuses to touch an existing account (previously anyone could reset its password).
// - In production the password must come from ADMIN_PASSWORD; the old hard-coded
//   default is only used for local development.
export const seedAdmin = async (req, res) => {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || "admin@nestro.com")
      .toLowerCase()
      .trim();
    const isProd = process.env.NODE_ENV === "production";
    const adminPassword =
      process.env.ADMIN_PASSWORD || (isProd ? null : "admin123");

    if (!adminPassword) {
      return res.status(403).json({
        success: false,
        message: "Set ADMIN_PASSWORD in the server environment to seed an admin in production.",
      });
    }

    const existing = await UserModel.findOne({ email: adminEmail });
    if (existing) {
      return sendConflict(res, "Admin account already exists");
    }

    const admin = await UserModel.create({
      name: "Nestro Admin",
      email: adminEmail,
      password: await hashPassword(adminPassword),
      role: "superAdmin",
      isVerified: true,
      status: true,
    });

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      email: admin.email,
      role: admin.role,
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
