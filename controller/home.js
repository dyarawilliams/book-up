const Book = require('../models/book')
const User = require('../models/user')

module.exports = {
    getIndex: async (req, res) => {
        let books
        try {
            books = await Book.find().sort({ createdAt: 'desc' }).limit(10).exec()
            res.render('index', { title: 'Home', books: books, isAuth: req.isAuthenticated() })
        } catch (err) {
            books = []
            console.error(err)
        }
    }
}