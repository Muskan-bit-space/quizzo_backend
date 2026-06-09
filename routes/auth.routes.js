const express = require('express');
const path = require('path');
const router=express.Router();  //-----this is like app 
const {signup,signin}=require('../controllers/auth.controller.js')
router.use(express.json())
router.post('/signup',signup)
router.post('/signin',signin)
module.exports=router