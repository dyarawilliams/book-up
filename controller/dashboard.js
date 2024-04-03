const Author = require('../models/author')
const Book = require('../models/book')
const User = require('../models/user')

module.exports = {
    getIndex: async (req, res) => {
        try {
            const books = await Book.find().exec();
            const booksCount = await Book.countDocuments({}).exec()
            const authorsCount = await Author.countDocuments({}).exec()
            res.render('dashboard', { 
                title: 'Dashboard', 
                layout: 'layouts/dashboard', 
                isAuth: req.isAuthenticated(),
                user: req.user,
                books: books,
                booksCount: booksCount,
                authorsCount: authorsCount,
            })
        } catch (err) {
            console.error(err)
            // res.render('error/500')
        }
    },
    
}