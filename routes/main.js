const express = require('express')
const router = express.Router()
const passport = require('passport')
const validator = require('validator')
const { ensureAuth } = require('../middleware/auth')

const homeController = require('../controller/home')
const authController = require('../controller/auth')

// @desc Hompage
// @route GET /
router.get('/', homeController.getIndex)

// @desc About Page
// @route GET /about
router.get('/about', homeController.getAbout)

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


// @desc View Profile
// @route /profile
router.get('/profile', ensureAuth, (req, res) => {
    res.render('profile', {
        title: "Profile", 
        layout: 'layouts/layout',
        user: req.user,
        isAuth: req.isAuthenticated()
    })
})

router.get('profile/edit', ensureAuth, (req, res) => {
    res.render('editprofile', {
        title: "Edit Profile",
        layout: 'layouts/layout',
        user: req.user,
        isAuth: req.isAuthenticated()
    })
})

// router.get('*', (req, res) => {
//     try {
//         res.status(404)
//         res.render('error/404', { title: '404', isAuth: req.isAuthenticated() })
//     } catch (err) {
//         console.error(err)
//     }
// })

module.exports = router