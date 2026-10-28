const passport = require('passport')
const validator = require('validator')

const User = require('../models/user')
const { googleAuthConfigured } = require('../config/google')

function safeReturnPath(value, fallback) {
    if (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')) {
        return value
    }
    return fallback
}

module.exports = {
    getLogin: async (req, res, next) => {
        try {
            if (req.user) {
                return res.redirect('/dashboard')
            }
            return res.render('login', {
                title: 'Login',
                isAuth: req.isAuthenticated(),
                googleEnabled: googleAuthConfigured(),
            })
        } catch (err) {
            console.error(err)
            return next(err)
        }
    },
    postLogin: async (req, res, next) => {
        try {
            const validationErrors = []
            if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' })
            if (validator.isEmpty(req.body.password)) validationErrors.push({ msg: 'Password cannot be blank.' })

            if (validationErrors.length) {
                req.flash('errors', validationErrors)
                return res.redirect('/login')
            }
            req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false })

            passport.authenticate('local', (err, user, info) => {
                if (err) {
                    console.error('Authentication error:', err)
                    return next(err)
                }
                if (!user) {
                    req.flash('errors', info)
                    return res.redirect('/login')
                }
                const returnTo = safeReturnPath(req.session && req.session.returnTo, '/dashboard')
                req.session.regenerate((regenErr) => {
                    if (regenErr) {
                        console.error('Session regeneration error:', regenErr)
                        return next(regenErr)
                    }
                    req.logIn(user, (loginErr) => {
                        if (loginErr) {
                            console.error('Login error:', loginErr)
                            return next(loginErr)
                        }
                        req.flash('success', { msg: 'Success! You are logged in.' })
                        return res.redirect(returnTo)
                    })
                })
            })(req, res, next)
        } catch (err) {
            console.error('Post login error', err)
            return next(err)
        }
    },
    logout: async (req, res, next) => {
        try {
            if (req.session) {
                req.logout((err) => {
                    if (err) {
                        console.error('Logout error:', err)
                        return next(err)
                    }
                    req.session.regenerate((regenErr) => {
                        if (regenErr) {
                            console.error('Session regeneration error:', regenErr)
                            return next(regenErr)
                        }
                        req.flash('success', { msg: 'Success! You are logged out.' })
                        return res.redirect('/')
                    })
                })
            } else {
                return res.redirect('/')
            }
        } catch (err) {
            console.error(err)
            return next(err)
        }
    },
    getSignUp: async (req, res, next) => {
        try {
            if (req.user) {
                return res.redirect('/dashboard')
            }
            return res.render('signup', {
                title: 'Create an Account',
                isAuth: req.isAuthenticated(),
                googleEnabled: googleAuthConfigured(),
            })
        } catch (err) {
            console.error(err)
            return next(err)
        }
    },
    postSignUp: async (req, res, next) => {
        try {
            const validationErrors = []
            if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' })
            if (!validator.isLength(req.body.password, { min: 8 })) validationErrors.push({ msg: 'Password must be at least 8 characters long' })
            if (req.body.password !== req.body.confirmPassword) validationErrors.push({ msg: 'Passwords do not match' })

            if (validationErrors.length) {
                req.flash('errors', validationErrors)
                return res.redirect('/signup')
            }
            req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false })

            const user = new User({
                userName: req.body.userName,
                email: req.body.email,
                password: req.body.password
            })

            const existingUser = await User.findOne({
                $or: [
                    { email: req.body.email },
                    { userName: req.body.userName }
                ]
            });
            if (existingUser) {
                req.flash('errors', { msg: 'Account with that email address or username already exists.' });
                return res.redirect('/signup');
            }
            await user.save();
            req.session.regenerate((regenErr) => {
                if (regenErr) {
                    console.error('Session regeneration error:', regenErr)
                    return next(regenErr)
                }
                req.logIn(user, (loginErr) => {
                    if (loginErr) {
                        console.error('Signup login error:', loginErr)
                        req.flash('errors', { msg: 'There was a problem signing you in automatically. Please log in manually.' })
                        return res.redirect('/login')
                    }
                    return res.redirect('/dashboard')
                })
            })
        } catch (err) {
            console.error(err)
            return next(err)
        }
    }
}
