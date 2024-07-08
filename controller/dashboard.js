const Author = require('../models/author')
const Book = require('../models/book')
const User = require('../models/user')

module.exports = {
    getIndex: async (req, res) => {
        try {
            const books = await Book.find().exec();
            const booksCount = await Book.countDocuments({}).exec()
            const authorsCount = await Author.countDocuments({}).exec()
            const user = await User.findOne({})
            res.render('dashboard', { 
                title: 'Dashboard', 
                layout: 'layouts/dashboard', 
                isAuth: req.isAuthenticated(),
                user: user,
                books: books,
                booksCount: booksCount,
                authorsCount: authorsCount,
            })
        } catch (err) {
            console.error(err)
            // res.render('error/500')
        }
    },
    createBook: async (req, res) => {
        const book = new Book({
            isbn: req.body.isbn,
            title: req.body.title,
            author: req.body.author,
            publishDate: new Date(req.body.publishDate),
            pageCount: req.body.pageCount,
            description: req.body.description
        })
        saveCover(book, req.body.cover)
    
        try {
            const newBook = await book.save()
            // res.redirect(`books/${newBook.id}`)
            res.redirect('/dashboard/books')
        } catch (err) {
            console.error(err)
            renderNewPage(res, book, true)
        }
        // res.send('Create Book')
    },
    updateBook: async (req, res) => {
        let book 
        try {
            book = await Book.findById(req.params.id)
            book.title = req.body.title
            book.author = req.body.author
            book.isbn = req.body.isbn
            book.publishDate = new Date(req.body.publishDate)
            book.pageCount = req.body.pageCount
            book.description = req.body.description
            // Checks to see if cover exist and not an empty string
            if(req.body.cover != null && req.body.cover !== ''){
                saveCover(book, req.body.cover)
            }
            await book.save()
            res.redirect(`/dashboard/books/${book.id}`)
        } catch (err) {
            console.error(err)
            if(book != null){
                renderEditPage(res, book, true)
            } else {
                redirect('/')
            }
        }
    },
    deleteBook: async (req, res) => {
        let book 
        try {
            book = await Book.findById(req.params.id)
            await book.deleteOne()
            res.redirect('/dashboard/books')
        } catch (err) {
            console.error(err)
            if(book != null){
                res.render('books/show', {
                    book: book,
                    errorMessage: 'Could not remove book',
                    title: 'Error Page'
                })
            } else {
                res.render('/')
            }
    
        }
    }
}