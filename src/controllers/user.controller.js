import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


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
    const {email,username,password}= req.body;
    if(!username || !email){
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


export {registerUser,
        loginUser ,
        logoutUser       
}