const Author = require('../models/author')
const Book = require('../models/book')
const User = require('../models/user')

const imageMimeTypes = ['image/jpeg', 'image/png', 'images/gif']

module.exports = {
    getBooks: async (req, res) => {
        let query = Book.find().populate('author')
        if (req.query.title != null && req.query.title != '') {
            query = query.regex('title', new RegExp(req.query.title, 'i'))
        }
        // Publish Before filter
        if (req.query.publishedBefore != null && req.query.publishedBefore != '') {
            query = query.lte('publishDate', req.query.publishedBefore)
        }
        // Publish After filter
        if (req.query.publishedAfter != null && req.query.publishedAfter != '') {
            query = query.gte('publishDate', req.query.publishedAfter)
        }
        try {
            const books = await query.exec()
            // handle cases where the author might be null
            const booksWithAuthors = books.map(book => {
                if (book.author) {
                    return book
                } else {
                    book.author = { name: 'Unknown Author' }
                    return book
                }
            })
            res.render('books/index', {
                layout: 'layouts/layout',
                title: 'All Books',
                user: req.user,
                books: booksWithAuthors,
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
                user: req.user, 
                book: book,
                isAuth: req.isAuthenticated(), 
            })
        } catch (err) {
            console.error(err)
            res.redirect('/')
        }
    },
    createBook: async (req, res) => {
        const book = new Book({
            isbn: req.body.isbn,
            title: req.body.title,
            description: req.body.description,
            publishDate: new Date(req.body.publishDate),
            pageCount: req.body.pageCount,
            author: req.body.author
        })
        saveCover(book, req.body.cover)
    
        try {
            const newBook = await book.save()
            res.redirect(`books/${newBook.id}`)
            // res.redirect('books')
        } catch (err) {
            console.error(err)
            await renderNewPage(req, res, book, true)
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
                renderEditPage(req, res, book, true)
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
            if(book != null){
                res.render('books/show', {
                    book: book,
                    errorMessage: 'Could not remove book',
                    title: 'Error Page'
                })
            } else {
                res.render('/')
            }
            console.error(err)
        }
    }
}

function saveCover(book, coverEncoded){
    if (coverEncoded == null || coverEncoded.length < 1) return 
    const cover = JSON.parse(coverEncoded)
    if (cover != null && imageMimeTypes.includes(cover.type)){
        book.coverImage = new Buffer.from(cover.data, 'base64')
        book.coverImageType = cover.type
    }
}