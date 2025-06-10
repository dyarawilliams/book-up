const express = require('express')
const router = express.Router()
const passport = require('passport')
const validator = require('validator')
const { ensureAuth } = require('../middleware/auth')

const mainController = require('../controller/main')
const authController = require('../controller/auth')

// @desc Hompage
// @route GET /
router.get('/', mainController.getIndex)

// @desc About Page
// @route GET /about
router.get('/about', mainController.getAbout)

// @desc Login/Sign Up Page
// @route GET /login
router.get('/login', authController.getLogin)

// @desc Login/Sign Up Page
// @route POST /login
router.post('/login', authController.postLogin)

// @desc Register Page
// @route GET /signup
router.get('/signup', authController.getSignUp)

// @desc Register Page
// @route POST /signup
router.post('/signup', authController.postSignUp)

// @desc Logout user
// @route /logout
router.get('/logout', authController.logout)

// @desc View User Profile
// @route /profile
router.get('/profile', ensureAuth, mainController.getProfile)

// @desc Edit Profile
// @route GET /profile/edit
router.get('/profile/edit', ensureAuth, mainController.getEditProfile)

// @desc Update Profile
// @route POST /profile/edit
router.post('/profile/edit', ensureAuth, mainController.postEditProfile)

// router.get('*', (req, res) => {
//     try {
//         res.status(404)
//         res.render('error/404', { title: '404', isAuth: req.isAuthenticated() })
//     } catch (err) {
//         console.error(err)
//     }
// })

module.exports = router