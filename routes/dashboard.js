const express = require('express')
const router = express.Router()
const { ensureAuth } = require('../middleware/auth')
const imageMimeTypes = ['image/jpeg', 'image/png', 'images/gif']

const Book = require('../models/book')
const Author = require('../models/author')
const User = require('../models/user')

// @desc Dashboard
// @route GET /dashboard
router.get('/', ensureAuth, async (req, res) => {
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
})

// @desc All Books
// @route GET /dashboard/books/
router.get('/books', async (req, res) => {
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
})

// @desc New Book 
// @route GET /dashboard/books/new
router.get('/books/new', ensureAuth, async (req, res) => {
    renderNewPage(req, res, new Book())
    // res.send('New Book')
})

// @desc Create Book
// @route POST /dashboard/books/
router.post('/books', async (req, res) => {
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
})

// @desc Show Book 
// @route GET /dashboard/books/:id
router.get('/books/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id).populate('author')
        .exec()
        res.render('books/show', { title: 'Show Book', isAuth: req.isAuthenticated(), user: req.user, book: book })
    } catch (err) {
        console.error(err)
        res.redirect('/')
    }
})

// @desc Edit Book 
// @route GET /dashboard/books/:id/edit
router.get('/books/:id/edit', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
        renderEditPage(res, book)
    } catch (err) {
        console.error(err)
        res.redirect('/')
    }
})

// @desc Update Book 
// @route PUT /dashboard/books/:id 
router.put('/books/:id', async (req, res) => {
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
})

// @desc Delete Book 
// @route GET /dashboard/books/:id
router.delete('/books/:id', async (req, res) => {
    let book 
    try {
        book = await Book.findById(req.params.id)
        await book.remove()
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
})

// @desc Books Added
// @route Get /dashboard/books/mybooks
router.get('/mybooks', async (req, res) => {
    let query = Book.find()

    try {
        const books = await query.exec()
        res.render('books/show-added', {
            layout: 'layouts/dashboard',
            title: 'My Books Added',
            user: req.user,
            isAuth: req.isAuthenticated(),
            books: books
        })
    } catch (err) {
        console.error(err)
    }
})

// @desc New Book 
// @route GET /dashboard/authors/new
router.get('/authors/new', ensureAuth, (req, res) => {
    res.render('authors/new', { 
        title: 'Add New Author',
        layout: 'layouts/dashboard',
        isAuth: req.isAuthenticated(),
        author: new Author()
    })
})

async function renderNewPage(req, res, book, hasError = false){
    renderFormPage(req, res, book, 'new', hasError)
}

async function renderEditPage(res, book, hasError = false){
    renderFormPage(res, book, 'edit', hasError)
}

async function renderFormPage(req, res, book, form, hasError = false){
    try {
        const authors = await Author.find({})
        const params = {
            layout: 'layouts/dashboard',
            authors: authors,
            book: book,
            title: 'Form Page',
            user: req.user,
            isAuth: req.isAuthenticated()
        }
        if(hasError) {
            if(form === 'edit'){
                params.errorMessage = 'Error Updating Book'
            } else {
                params.errorMessage = 'Error Creating Book'
            }
        }
        res.render(`books/${form}`, params)
    } catch(err) {
        console.error(err)
        res.redirect('/dashboard')
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
module.exports = router