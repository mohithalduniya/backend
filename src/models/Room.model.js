import mongoose from "mongoose"

const roomschema =new mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    slug:{
        type:String,
        required:true,
        unique:true
    },
    status:{
        type:Boolean,
        default:true
    },
       image:{
        type:String,
    },
})

const roomModel = mongoose.model("room",roomschema)
export default roomModel;