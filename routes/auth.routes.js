const express = require('express');
const path = require('path');
const router=express.Router();  //-----this is like app 
const {signup,signin,getMe}=require('../controllers/auth.controller.js')
const {requireAuth}=require("../middlewares/requireAuth.js")
router.use(express.json())
router.post('/signup',signup)
router.post('/signin',signin)
router.get('/me',requireAuth,getMe)
module.exports=router