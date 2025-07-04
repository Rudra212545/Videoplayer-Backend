import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";


const app = express();


app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended: true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser());

// Routes Import
import userRouter from "./routes/user.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
 

// router decleration
// http://localhost:8000/api/v1/users/register - 1st route 
app.use("/api/v1/users",userRouter);
app.use("/api/v1/tweets",tweetRouter);




export { app } 
