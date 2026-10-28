const LocalStrategy = require('passport-local').Strategy
const GoogleStrategy = require('passport-google-oauth20').Strategy
const User = require('../models/user')
const { googleAuthConfigured, googleCallbackURL, uniqueUserName } = require('./google')

module.exports = function (passport) {

    passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
        try {
            const user = await User.findOne({ email: email.toLowerCase() });
            if (!user) {
                return done(null, false, { msg: `Email ${email} not found.` })
            }
            if (!user.password) {
                return done(null, false, { msg: 'Your account was registered using a sign-in provider. To enable password login, sign in using a provider, and then set a password under your user profile.' })
            }
            user.comparePassword(password, (err, isMatch) => {
                if (err) { return done(err); }
                if (isMatch) {
                    return done(null, user);
                }
                return done(null, false, { msg: 'Invalid email or password.' });
            });
        } catch (err) {
            return done(err)
            console.error(err)
        }
    }))

    if (googleAuthConfigured()) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: googleCallbackURL(),
        scope: ['profile', 'email'],
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            let user = await User.findOne({ googleId: profile.id })
            if (user) {
                return done(null, user)
            }
            const email = profile.emails && profile.emails[0] && profile.emails[0].value
            const image = profile.photos && profile.photos[0] && profile.photos[0].value
            const givenName = profile.name && profile.name.givenName
            const familyName = profile.name && profile.name.familyName
            const seed = profile.displayName || (email ? email.split('@')[0] : '') || 'reader'
            user = await User.create({
                googleId: profile.id,
                firstName: givenName,
                lastName: familyName,
                email: email,
                image: image,
                userName: await uniqueUserName(User, seed),
            })
            return done(null, user)
        } catch (err) {
            console.error(err)
            return done(err)
        }
    }))
    }
    

    // Persist user data (after successful authentication) into session
    passport.serializeUser(async (user, done) => {
        try {
            done(null, user.id); // Store the user ID in the session
        } catch (err) {
            console.error(err);
            return done(err);
        }
    })

    // Retrieve user data from session
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id); // Retrieve user from the database 
            done(null, user);
        } catch (err) {
            console.error(err);
            done(err);
        }
    })
}