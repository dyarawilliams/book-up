const LocalStrategy = require('passport-local').Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy
const mongoose = require('mongoose')
const User = require('../models/user')

module.exports = function (passport) {
    passport.use(new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
        User.findOne({ email: email.toLowerCase() }, (err, user) => {
            if (err) { return done(err) }
            if (!user) {
                return done(null, false, { msg: `Email ${email} not found.` })
            }
            if (!user.password) {
                return done(null, false, { msg: 'Your account was registered using a sign-in provider. To enable password login, sign in using a provider, and then set a password under your user profile.' })
            }
            user.comparePassword(password, (err, isMatch) => {
                if (err) { return done(err) }
                if (isMatch) {
                    return done(null, user)
                }
                return done(null, false, { msg: 'Invalid email or password.' })
            })
        })
    })),
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback',
        scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
        // Get the user data
        const newUser = {
            googleId: profile.id,
            displayName: profile.displayName,
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            email: profile.emails[0].value,
            image: profile.photos[0].value
        }

        try {
            let user = await User.findOne({ googleId: profile.id })
            if (user) {
                // If user present in Database
                done(null, user)
            } else {
                // If user is not present in database save user to database
                user = await User.create(newUser)
                done(null, user)
            }
        } catch (err) {
            console.error(err)
        }
    }))

    // Persist user data (after successful authentication) into session
    passport.serializeUser((user, done) => {
    done(null, user.id)
    })

    // Retrieve user data from session
    passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => {
            done(err, user)
        })
    })
}