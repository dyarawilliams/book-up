const Author = require('../models/author')
const Book = require('../models/book')
const genres = require('../config/genres')

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
            return res.render('books/index', {
                layout: 'layouts/layout',
                title: 'All Books',
                user: req.user,
                books: booksWithAuthors,
                searchOptions: req.query,
                isAuth: req.isAuthenticated()
            })
        } catch (err) {
            console.error(err)
            return res.redirect('/')
        }
    },
    showBook: async (req, res) => {
        try {
            const book = await Book.findById(req.params.id).populate('author').exec()
            if (!book) {
                return res.redirect('/books')
            }
            return res.render('books/show', {
                title: 'Show Book',
                user: req.user,
                book: book,
                isAuth: req.isAuthenticated(),
            })
        } catch (err) {
            console.error(err)
            return res.redirect('/')
        }
    },
    createBook: async (req, res) => {
        const book = new Book({
            isbn: req.body.isbn,
            title: req.body.title,
            description: req.body.description,
            genre: req.body.genre || 'Other',
            publishDate: new Date(req.body.publishDate),
            pageCount: req.body.pageCount,
            author: req.body.author
        })

        try {
            saveCover(book, req.body.cover)
            const newBook = await book.save()
            return res.redirect(`/books/${newBook.id}`)
        } catch (err) {
            console.error(err)
            return renderNewPage(req, res, book, true)
        }
    },
    updateBook: async (req, res) => {
        let book
        try {
            book = await Book.findById(req.params.id)
            if (!book) {
                return res.redirect('/books')
            }
            book.title = req.body.title
            book.author = req.body.author
            book.isbn = req.body.isbn
            book.publishDate = new Date(req.body.publishDate)
            book.pageCount = req.body.pageCount
            book.description = req.body.description
            book.genre = req.body.genre || 'Other'
            // Checks to see if cover exist and not an empty string
            if (req.body.cover != null && req.body.cover !== '') {
                saveCover(book, req.body.cover)
            }
            await book.save()
            return res.redirect(`/books/${book.id}`)
        } catch (err) {
            console.error(err)
            if (book != null) {
                return renderEditPage(req, res, book, true)
            }
            return res.redirect('/books')
        }
    },
    deleteBook: async (req, res) => {
        let book
        try {
            book = await Book.findById(req.params.id).populate('author')
            if (!book) {
                return res.redirect('/books')
            }
            await book.deleteOne()
            return res.redirect('/books')
        } catch (err) {
            console.error(err)
            if (book == null) {
                return res.redirect('/books')
            }
            return res.render('books/show', {
                book: book,
                errorMessage: 'Could not remove book',
                title: 'Error Page',
                user: req.user,
                isAuth: req.isAuthenticated(),
            })
        }
    },
    renderNewPage,
    renderEditPage,
}

async function renderNewPage(req, res, book, hasError = false) {
    await renderFormPage(req, res, book, 'new', hasError)
}

async function renderEditPage(req, res, book, hasError = false) {
    await renderFormPage(req, res, book, 'edit', hasError)
}

async function renderFormPage(req, res, book, form, hasError = false) {
    try {
        const authors = await Author.find({})
        const params = {
            layout: 'layouts/dashboard',
            authors: authors,
            book: book,
            genres,
            title: 'Form Page',
            user: req.user,
            isAuth: req.isAuthenticated()
        }
        if (hasError) {
            params.errorMessage = form === 'edit' ? 'Error Updating Book' : 'Error Creating Book'
        }
        return res.render(`books/${form}`, params)
    } catch (err) {
        console.error(err)
        return res.redirect('/books')
    }
}

function saveCover(book, coverEncoded) {
    if (coverEncoded == null || coverEncoded.length < 1) return
    const cover = JSON.parse(coverEncoded)
    if (cover != null && imageMimeTypes.includes(cover.type)) {
        book.coverImage = new Buffer.from(cover.data, 'base64')
        book.coverImageType = cover.type
    }
}
