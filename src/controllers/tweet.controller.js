import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    let { content } = req.body;
    const user = req.user;
    if(content == ""){
        throw new ApiError(400,"Content is required tp create a tweet")
    }
    if(!user){
        throw new ApiError(401,"Unauthorized Accesss")
    }
    const tweetedUser = await User.findOne(user._id)

    const tweet = await Tweet.create({
        content,
        owner:tweetedUser
    })

    return res
    .status(200)
    .json(new ApiResponse(201,tweet, "Tweet created Sucessfully"))

})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const { userId } = req.params;

    const tweets = await Tweet.find({ owner: userId }); 
    if (!tweets || tweets.length === 0) {
        throw new ApiError(404, "No tweets found for this user");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {content} =req.body;
    const {tweetId} = req.params;
    const tweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set:{
                content,
            }
        },
        {new:true}
        )

        if(!tweet){
            throw new ApiError(400,"Failed to update tweet")
        }

        return res
        .status(200)
        .json(new ApiResponse(200, tweet , "Tweet updated successfully"));
})


const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId}= req.params;
    const deletedTweet = await Tweet.findByIdAndDelete(
        tweetId)
    if(!deleteTweet){
        throw new ApiError(400,"Failed to delete the tweet");
    }
    return res 
    .status(200)
    .json(new ApiResponse(200,deletedTweet,"Tweet deleted succesfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}