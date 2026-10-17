import jwt from "jsonwebtoken"
import dotenv from 'dotenv'
dotenv.config()

function generateOtp() {
    return Math.floor(
        100000 + Math.random() * 900000
    ).toString()
}


const getOtpExpire = () => {
    return new Date(
        Date.now() + 5 * 60 * 1000
    );
}

const generateToken = (userOrId, role = "user") => {
    const id = typeof userOrId === "object" && userOrId?._id ? userOrId._id : userOrId;
    const userRole = typeof userOrId === "object" && userOrId?.role ? userOrId.role : role;
    const secret = process.env.SECRET_KEY || "nestro_jwt_secret_key_2026_super_secure_auth";
    return jwt.sign(
        { _id: id, role: userRole },
        secret,
        { expiresIn: "30d" }
    );
};

export { generateOtp, getOtpExpire, generateToken };