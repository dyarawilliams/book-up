const passport = require('passport')
const validator = require('validator')

const User = require('../models/user')

module.exports = {
    getLogin: async (req, res) => {
        try {
            if (req.user) {
                return res.redirect('/dashboard', { isAuth: req.isAuthenticated() })
            }
            res.render('login', { title: 'Login', isAuth: req.isAuthenticated() })
        } catch (err) {
            console.error(err)
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
    
            passport.authenticate('local', async (err, user, info) => {
                if (err) { return next(err) }
                if (!user) {
                    req.flash('errors', info)
                    return res.redirect('/login')
                }
                req.logIn(user, async (err) => {
                    if (err) { return next(err) }
                    req.flash('success', { msg: 'Success! You are logged in.' })
                    res.redirect(req.session.returnTo || '/dashboard',)
                })
            })(req, res, next)
        } catch (err) {
            console.error(err)
        }
    },
    logout: async (req, res, next) => {
        try {
            req.logout((err) => {
                if (err) { return next(err); }
                console.log('User has logged out.')
            })
            req.session.destroy((err) => {
                if (err) {
                    console.log('Error : Failed to destroy the session during logout.', err)
                } else {
                    res.send('Logout Successful')
                    req.user = null
                    res.redirect('/')
                }
            })
            res.redirect('/')
        } catch (err) {
            // console.log('Error : Failed to destroy the session during logout.', err)
            console.error(err);
        }
    },
    getSignUp: async (req, res) => {
        try {
            if (req.user) {
                return res.redirect('/dashboard', { title: 'Signup', isAuth: req.isAuthenticated() })
            }
            res.render('signup', { title: 'Create an Account', isAuth: req.isAuthenticated() })
        } catch (err) {
            console.error(err)
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
                return res.redirect('../signup')
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
                return res.redirect('../signup');
            }
            await user.save();
            await req.logIn(user);
            res.redirect('/dashboard')
        } catch (err) {
            console.error(err)
        }
    }
}