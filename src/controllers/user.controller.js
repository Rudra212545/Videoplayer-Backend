import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import  jwt  from "jsonwebtoken";


const genetareAccessAndRefreshTokens = async (userId)=> {
    try {
        const user  = await User.findById(userId)
       const accessToken =  user.generateAccessToken();
       const refreshToken =  user.generateRefreshToken();

       user.refreshToken = refreshToken;
       await user.save({validateBeforeSave : false})

       return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access token ")
    }
}

const registerUser = asyncHandler(async (req,res)=>{
    // console.log(req.body);
    const {fullname, email, username, password}= req.body;
    // console.log(fullname,email,username,password);
   
    if(fullname === ""){
        throw new ApiError(400,"Fullname is required");
    }
    if(username === ""){
        throw new ApiError(400,"Username is required");
    }
    if(password === ""){
        throw new ApiError(400,"Password is required");
    }
    if(email === ""){
        throw new ApiError(400,"Email is required");
    }

    const existedUser = await User.findOne({
        $or:[ {email}, {username} ]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already exists");
    }
    console.log( req.files?.avatar[0]?.path);
    const avatarLocalPath = req.files?.avatar[0]?.path;

    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath ;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalPath = req.files.coverImage.path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
    }
    const avatar =  await uploadOnCloudinary(avatarLocalPath)

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    

    if(!avatar){
        throw new ApiError(400,"Avatar is required");
    }

    const user = await User.create({
        fullname,
        username:username.toLowerCase(),
        email,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        password


    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user");
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered Successfully")
    )



})

const loginUser = asyncHandler(async (req,res)=>{
    // console.log("req.body:", req.body);
    const {email, username, password}= req.body;

    if(!username && !email){
        throw new ApiError(400,"Username or Email is required");
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password) 

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid User Credentials");
    }

    const {accessToken,refreshToken}=  await genetareAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User Logged In Successfully"
            )
    )
})

const logoutUser = asyncHandler(async (req,res)=>{
   await User.findByIdAndUpdate(
        req.user._id,{
            $set :{
                refreshToken : undefined
            }
        },
        {
            new:true 
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User Logged Out"))
})

const refreshAccessToken = asyncHandler(async (req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Request")
    }

   try {
     const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
     )
     const user = await User.findById(decodedToken?._id)
 
     if(!user){
         throw new ApiError(401, "Invalid Refresh Token ");
     }
 
     if(incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401,"Refresh Token is expired or used ");
     }
 
     const options ={
         httpOnly:true,
         secure:true
     }
 
     const {accessToken, newRefreshToken} = await genetareAccessAndRefreshTokens(user._id)
 
     return res
     .status(200)
     .cookies("accessToken",accessToken,options)
     .cookies("refreshToken",newRefreshToken,options)
     .json(
         new ApiResponse(
             200,
             {accessToken,refreshToken: newRefreshToken},
             "Access Token refreshed"
         )
     )
   } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
   }

    
})

const changeCurrentPassowrd = asyncHandler(async (req,res)=>{
    const{oldPassword, newPassword}= req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Old Password");
    }

    user.password= newPassword;
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password changes sucessfully"));
})

const getCurrentUser = asyncHandler(async (req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"Current User Fetched Successfully"))
})

const updateAccountDetails = asyncHandler(async (req,res)=>{
    const {fullname,email,} = req.body;

    if(!fullname || !email){
        throw new ApiError(400,"All fields are required"); 
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname,
                email
            }
        },
        {new:true}
        ).select("-password")

        return res
        .status(200)
        .json(new ApiResponse(200,user , "Account details updated successfully"));
})

const updateUserAvatar = asyncHandler(async (req,res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        new ApiError(400,"Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }
    
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { 
            $set:{
                avatar:avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover Image Uploaded"))
    
})
const updateCoverImage = asyncHandler(async (req,res)=>{
    const coverLocalPath = req.file?.path

    if(!coverLocalPath){
        new ApiError(400,"Cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading on Cover Image")
    }
    
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { 
            $set:{
                coverImage:coverImage.url
            }
        },
        {new: true}
    ).select("-password")
    
    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover Image Uploaded"))
})

export {registerUser,
        loginUser ,
        logoutUser,
        refreshAccessToken,
        changeCurrentPassowrd,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar ,
        updateCoverImage   
}