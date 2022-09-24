const express = require('express')
const router = express.Router()
const passport = require('passport')
const validator = require('validator')
const { ensureAuth } = require('../middleware/auth')

const Book = require('../models/book')
const User = require('../models/user')

// @desc Hompage
// @route GET /
router.get('/', async (req, res) => {
    let books
    try {
        books = await Book.find().sort({ createdAt: 'desc' }).limit(10).exec()
        res.render('index', { title: 'Home', books: books, isAuth: req.isAuthenticated() })
    } catch {
        books = []
    }

})

// @desc Login/Sign Up Page
// @route GET /login
router.get('/login', (req, res) => {
    try {
        if (req.user) {
            return res.redirect('/dashboard', { isAuth: req.isAuthenticated() })
        }
        res.render('login', { title: 'Login', isAuth: req.isAuthenticated() })
    } catch (err) {
        console.error(err)
    }
})

// @desc Login/Sign Up Page
// @route POST /login
router.post('/login', (req, res, next) => {
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
            if (err) { return next(err) }
            if (!user) {
                req.flash('errors', info)
                return res.redirect('/login')
            }
            req.logIn(user, (err) => {
                if (err) { return next(err) }
                req.flash('success', { msg: 'Success! You are logged in.' })
                res.redirect(req.session.returnTo || '/dashboard',)
            })
        })(req, res, next)
    } catch (err) {
        console.error(err)
    }
})

// @desc Register Page
// @route GET /signup
router.get('/signup', (req, res) => {
    try {
        if (req.user) {
            return res.redirect('/dashboard', { title: 'Signup', isAuth: req.isAuthenticated() })
        }
        res.render('signup', { title: 'Create an Account', isAuth: req.isAuthenticated() })
    } catch (err) {
        console.error(err)
    }
})

// @desc Register Page
// @route POST /signup
router.post('/signup', (req, res, next) => {
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

        User.findOne({
            $or: [
                { email: req.body.email },
                { userName: req.body.userName }
            ]
        }, (err, existingUser) => {
            if (err) { return next(err) }
            if (existingUser) {
                req.flash('errors', { msg: 'Account with that email address or username already exists.' })
                return res.redirect('../signup')
            }
            user.save((err) => {
                if (err) { return next(err) }
                req.logIn(user, (err) => {
                    if (err) {
                        return next(err)
                    }
                    res.redirect('/dashboard')
                })
            })
        })
    } catch (err) {
        console.error(err)
    }
})

// @desc Logout user
// @route /logout
router.get('/logout', (req, res, next) => {
    req.logout(() => {
        console.log('User has logged out.')
    })
    req.session.destroy((err) => {
        if (err) {
            console.log('Error : Failed to destroy the session during logout.', err)
        } else {
            res.send('Logout Successful')
            req.user = null
            // res.redirect('/')
        }
    })
    res.redirect('/')
})


// @desc View Profile
// @route /profile
router.get('/profile', ensureAuth, (req, res) => {
    res.render('profile', { 
        layout: 'layouts/dashboard',
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