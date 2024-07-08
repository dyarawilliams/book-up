const Author = require('../models/author')
const Book = require('../models/book')
const User = require('../models/user')

module.exports = {
    getBooks: async (req, res) => {
        let query = Book.find()
        if (req.query.title != null && req.query.title != '') {
            query = query.regex('title', new RegExp(req.query.title, 'i'))
        }
        // Publish Before filter
        if (req.query.publishedBefore != null && req.query.publishedBefore != '') {
            query = query .lte('publishDate', req.query.publishedBefore)
        }
        // Publish After filter
        if (req.query.publishedAfter != null && req.query.publishedAfter != '') {
            query = query .gte('publishDate', req.query.publishedAfter)
        }
        try {
            const books = await query.exec()
            res.render('books/index', {
                layout: 'layouts/dashboard',
                title: 'All Books',
                user: req.user,
                books: books,
                searchOptions: req.query,
                isAuth: req.isAuthenticated()
            })
        } catch (err){
            console.error(err)
            res.redirect('/')
        }
        // res.send('All Book')
    },
    showBook: async (req, res) => {
        try {
            const book = await Book.findById(req.params.id).populate('author')
            .exec()
            res.render('books/show', { 
                title: 'Show Book', 
                layout: 'layouts/dashboard', 
                isAuth: req.isAuthenticated(), 
                user: req.user, 
                book: book 
            })
        } catch (err) {
            console.error(err)
            res.redirect('/')
        }
    }
}