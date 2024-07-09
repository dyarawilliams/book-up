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
                // layout: 'layouts/dashboard',
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