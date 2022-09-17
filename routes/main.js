const express = require('express')
const router = express.Router()
const passport = require('passport')
const validator = require('validator')
const { ensureAuth, ensureGuest } = require('../middleware/auth')

const Book = require('../models/book')
const User = require('../models/user')

// @desc Hompage
// @route GET /
router.get('/', async (req, res) => {
    let books
    try {
        books = await Book.find().sort({ createdAt: 'desc' }).limit(10).exec()
        res.render('index', { books: books })
    } catch {
        books = []
    }

})

// @desc Login/Sign Up Page
// @route GET /login
router.get('/login', (req, res) => {
    try {
        if (req.user) {
            return res.redirect('/dashboard')
        }
        res.render('login', { title: 'Login' })
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
                res.redirect(req.session.returnTo || '/dashboard')
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
            return res.redirect('/dashboard')
        }
        res.render('signup')
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
                    res.redirect('/todos')
                })
            })
        })
    } catch (err) {
        console.error(err)
    }
})
// @desc Dashboard
// @route GET /dashboard
router.get('/dashboard', async (req, res) => {
    try {
        // const stories = await Story.find({ user: req.user.id }).lean()
        res.render('dashboard', { layout: 'dashboard' })

    } catch (err) {
        console.error(err)
        // res.render('error/500')
    }
})

// @desc Logout user
// @route /logout
router.get('/logout', (req, res, next) => {
    req.logout(() => {
        console.log('User has logged out.')
      })
      req.session.destroy((err) => {
        if (err) console.log('Error : Failed to destroy the session during logout.', err)
        req.user = null
        res.redirect('/')
      })
})

module.exports = router