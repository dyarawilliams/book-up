const express = require('express')
const passport = require('passport')
const router = express.Router()
const { googleAuthConfigured } = require('../config/google')

function googleUnavailable(req, res) {
    req.flash('errors', { msg: 'Google sign-in is not configured.' })
    return res.redirect('/login')
}

// @desc Auth with Google
// @route GET /auth/google
router.get('/google', (req, res, next) => {
    if (!googleAuthConfigured()) {
        return googleUnavailable(req, res)
    }
    return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next)
})

// @desc Google Auth Callback
// @route GET /auth/google/callback
router.get('/google/callback', (req, res, next) => {
    if (!googleAuthConfigured()) {
        return googleUnavailable(req, res)
    }
    return passport.authenticate('google', {
        successRedirect: '/dashboard',
        failureRedirect: '/login/failed'
    })(req, res, next)
})

router.get('/login/failed', (req, res) => {
    res.status(401).json({
        error: true,
        message: "Login Failure!"
    })
})

module.exports = router
