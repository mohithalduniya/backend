import mongoose from "mongoose"

const categoryschema =new mongoose.Schema({
    image:{
        type:String,
    },
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
    
})

const categoryModel = mongoose.model("category",categoryschema)
export default categoryModel;