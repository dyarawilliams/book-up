const express = require('express')
const passport = require('passport')
const router = express.Router()

// @desc Auth with Google
// @route GET /auth/google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

// @desc Google Auth Callback
// @route GET /auth/google/callback
router.get('/google/callback', 
    passport.authenticate('google', {
        successRedirect: process.env.GOOGLE_CLIENT_ID,
        failureRedirect: '/login/failed' 
    }),
    (req, res) => {
        // Successful authentication, redirects to dashboard.
        res.redirect('/dashboard')
    }
)

router.get('login/failed', (req, res) => {
    res.status(401).json({
        error: true,
        message: "Login Failure!"
    })
})

// @desc Logout user
// @route /auth/logout
// router.post('/logout', (req, res, next) => {
//     req.logout(function(err) {
//         if (err) { return next(err) } 
//         res.redirect('/');
//     });
// })

module.exports = router