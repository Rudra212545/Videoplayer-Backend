import express from "express";
import {asyncHandler} from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req,res)=>{
     res.status(200).json({
        message:"It's Working "
     })
})


export {registerUser}