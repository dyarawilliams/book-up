const Book = require('../models/book')
const User = require('../models/user')

module.exports = {
    getIndex: async (req, res) => {
        let books
        try {
            books = await Book.find({ }).sort({ createdAt: 'desc' }).limit(10).exec()
            res.render('index', { title: 'Home', books: books, isAuth: req.isAuthenticated() })
        } catch (err) {
            books = []
            console.error(err)
        }
    },
    getAbout: async (req, res) => {
        try {
            res.render('about', { 
                title: 'Home', 
                isAuth: req.isAuthenticated() 
            })
        } catch (err) {
            console.error(err)
        }
    },
    getProfile: async (req, res) => {
        try {
            console.log('req.user:', req.user) 
            // req.user is populated by passport middleware
            const user = req.user;
            console.log(user)

            if (!user) {
                return res.redirect('/login')
            }

            res.render('profile/index', {
                title: 'Your Profile',
                layout: 'layouts/dashboard',
                isAuth: req.isAuthenticated(),
                user: user,
            })

        } catch (err) {
            console.error(err)
            res.redirect('/dashboard');
        }
    },
    getEditProfile: async (req, res) => {
    
        res.render('profile/edit', { user })
    },
    // postEditProfile: async (req, res) => {
    //     try {
    //         const user = await User.findById(req.user.id)
    //         user.userName = req.body.userName
    //         user.firstName = req.body.firstName
    //         user.lastName = req.body.lastName
    //         user.email = req.body.email
    //         await user.save()
    //         res.redirect('/profile')
    //     } catch (err) {
    //         res.render('profile/edit', { 
    //             user: req.body, 
    //             errorMessage: 'Error updating profile',
    //             isAuth: req.isAuthenticated()
    //         })
    //     }
    // }
}