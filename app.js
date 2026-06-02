// import dotenv from 'dotenv';
const dotenv=require('dotenv')
dotenv.config();
const cors = require("cors");

const express = require('express');
const path = require('path');


const {connectDB}=require('./db')
const auth=require('./routes/auth.routes')
const {joinquiz,createquiz}=require('./controllers/SocketController')


const app = express();
app.use(express.urlencoded({ extended: true }));

app.use(cors({  
    origin: process.env.CORS_ORIGIN,
    credentials:true
}));

app.use('/auth',auth)


///////////////////////////////////////////
const {createServer}=require('http')
const {Server}=require('socket.io')
////////////////////////////////////////////
const {MongoClient}=require('mongodb')
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

// socket server code  --------------------------------------START-----------------------------------
httpServer.listen(process.env.PORT,()=>{
  console.log("server on ",process.env.PORT);
   connectDB();

})
// socket server code --------------------------------------------END-----------------------------
