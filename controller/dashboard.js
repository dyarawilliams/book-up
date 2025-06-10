const Author = require('../models/author')
const Book = require('../models/book')
const User = require('../models/user')

module.exports = {
    getIndex: async (req, res) => {
        try {
            const books = await Book.find().populate('author');
            const booksCount = await Book.countDocuments({}).exec()
            const authorsCount = await Author.countDocuments({}).exec()

            if (!req.isAuthenticated()) {
                return res.redirect('/login');
            }

            // Fetch the user that is authenticated in the passport session
            // This assumes that the user is stored in the session by Passport.js
            const user = req.user
            console.log(user)

            const activities = [
                'Added "New Book 1"',
                'Updated author details for "Author 2"',
                'Deleted "Old Book"',
            ];

            res.render('dashboard', { 
                title: 'Dashboard', 
                layout: 'layouts/dashboard', 
                isAuth: req.isAuthenticated(),
                user: user,
                books: books,
                booksCount: booksCount,
                authorsCount: authorsCount,
                activities
            })
        } catch (err) {
            console.error(err)
        }
    }
}