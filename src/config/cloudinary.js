
import dotenv from "dotenv";
dotenv.config();  
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME ? process.env.CLOUD_NAME.trim() : "", 
  api_key: process.env.API_KEY ? process.env.API_KEY.trim() : "", 
  api_secret: process.env.API_SECRET ? process.env.API_SECRET.trim() : ""
});

export default cloudinary