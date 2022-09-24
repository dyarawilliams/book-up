const express = require('express')
const router = express.Router()

const { ensureAuth } = require('../middleware/auth')

const Book = require('../models/book')
const User = require('../models/user')

// @desc Dashboard
// @route GET /dashboard
// router.get('/', ensureAuth, (req, res) => {
//     try {
//         res.render('dashboard', { 
//             title: 'Dashboard', 
//             layout: 'layouts/dashboard', 
//             isAuth: req.isAuthenticated(),
//             user: req.user
//         })
//     } catch (err) {
//         console.error(err)
//         // res.render('error/500')
//     }
// })

// @desc View Profile
// @route /profile
// router.get('/profile', ensureAuth, (req, res) => {
//     console.log(req.user)
// })
