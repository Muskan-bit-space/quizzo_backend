// import dotenv from 'dotenv';
const dotenv=require('dotenv')
dotenv.config();
const cors = require("cors");

const express = require('express');
const path = require('path');
const {connectDB}=require('./db')
const Question=require('./models/qtable.model')
const qtable_create=require('./controllers/qtable.create.controller')
const user_create=require('./controllers/user.create.controller')
const quiz_create=require('./controllers/quiz.create.controller')
const {joinquiz,createquiz}=require('./controllers/SocketController')
const {pre_signin}=require('./controllers/auth.controller')
const app = express();
app.use(express.urlencoded({ extended: true }));

app.use(cors({  
    origin: process.env.CORS_ORIGIN,
    credentials:true
}));

///////////////////////////////////////////
const {createServer}=require('http')
const {Server}=require('socket.io')
////////////////////////////////////////////
const {MongoClient}=require('mongoose')
const httpServer=createServer(app);
const io=new Server(httpServer,{
  cors:{origin:process.env.CORS_ORIGIN}
})

io.on('connection',(socket)=>{
  console.log(`socket connected:${socket}`)
  socket.on('join-quiz',(msg)=>{
    joinquiz(socket);
  })

  socket.on('create-quiz',(msg)=>{
    createquiz(socket);
  })

  
  
})
// Middleware to parse URL-encoded bodies------------------------------------------------

// ------------------------------------------------------------------------------------------
const PORT = process.env.PORT || 4444;
app.get('/create',(req,res)=>{
  const b=qtable_create();
  res.send("blog created: ")
  res.json(b)
})
app.post('/signup',async(req,res)=>{
  // const r=req.body;
  // const b=user_create(req.body.mail, req.body.pwd);
  // console.log("hey");
  
  const{email, password}=req.query;
  const user_created=await user_create(email, password);  
  //kyunki ek promise aayega hmesha from an async 
  // function and hmei use resolve hone dena h
  // user_create( req.body.pwd);
  // res.send("user created: ",);
  // console.log("user_created ",user_created)
  if(user_created!=undefined){
    res.json(user_created);

  } 
  else res.json({
    "usercreated":"no"
  })
})

app.post('/signin/email/password',async (req,res)=>{
  //another auth ka function for setting the cookie
  const {email,password}=req.body;
  const user_exists=await pre_signin(email,password);     ///this will find if the user has signed up or not


  //now set the cookie:

  if(user_exists){
    res.cookie(email,password,{
      httpOnly:true
    })
    res.send("cookie created babay")
  }

  else{
    res.send("user not found or cookie-making method ain't working")
  }

  
})


app.get('/qc',async (req,res)=>{
  const b=await quiz_create();
  // res.send("quiz created: ")
  res.json(b.toObject())
})
  // blog_create();
app.get('/',(req,res)=>{
  res.send("you are on the get endppoint of the root")
})
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
//   connectDB();
// }); 

// socket server code  --------------------------------------START-----------------------------------
httpServer.listen(process.env.PORT,()=>{
  console.log("server on ",process.env.PORT);
   connectDB();

})
// socket server code --------------------------------------------END-----------------------------
