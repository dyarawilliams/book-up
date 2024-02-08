const express = require('express')
const router = express.Router()
const Book = require('../models/book')
const Author = require('../models/author')
const imageMimeTypes = ['image/jpeg', 'image/png', 'images/gif']
const { ensureAuth, ensureGuest } = require('../middleware/auth')

// @desc All Books
// @route GET /books/
router.get('/', async (req, res) => {
    let query = Book.find().populate('author')
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
            title: 'All Books',
            books: books,
            searchOptions: req.query,
            isAuth: req.isAuthenticated()
        })
    } catch {
        res.redirect('/')
    }
    // res.send('All Book')
})

// @desc New Book 
// @route GET /books/new
router.get('/new', async (req, res) => {
    renderNewPage(res, new Book())
    // res.send('New Book')
})

// @desc Create Book
// @route POST /books/
router.post('/', async (req, res) => {
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
        res.redirect('books')
    } catch {
        renderNewPage(res, book, true)
    }
    // res.send('Create Book')
})

// @desc Show Book 
// @route GET /books/:id
router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id).populate('author')
        .exec()
        res.render('books/show', { title: 'Show Book', isAuth: req.isAuthenticated(), book: book })
    } catch (error) {
        res.redirect('/')
    }
})

// @desc Edit Book 
// @route GET /books/:id/edit
router.get('/:id/edit', ensureAuth, async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
        renderEditPage(res, book)
    } catch (error) {
        console.log(error)
        res.redirect('/')
    }
})

// @desc Update Book 
// @route PUT /books/:id 
router.put('/:id', ensureAuth, async (req, res) => {
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
        res.redirect(`/books/${book.id}`)
    } catch (err) {
        console.log(err)
        if(book != null){
            renderEditPage(res, book, true)
        } else {
            redirect('/')
        }
    }
})

// @desc Delete Book 
// @route GET /books/:id
router.delete('/:id', ensureAuth, async (req, res) => {
    let book 
    try {
        book = await Book.findById(req.params.id)
        await book.remove()
        res.redirect('/books')
    } catch (error) {
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

async function renderNewPage(res, book, hasError = false){
    renderFormPage(res, book, 'new', hasError)
}

async function renderEditPage(res, book, hasError = false){
    renderFormPage(res, book, 'edit', hasError)
}

async function renderFormPage(res, book, form, hasError = false){
    try {
        const authors = await Author.find({})
        const params = {
            authors: authors,
            book: book,
            title: 'Form Page',
            isAuth: req.isAuthenticated(),
        }
        if(hasError) {
            if(form === 'edit'){
                params.errorMessage = 'Error Updating Book'
            } else {
                params.errorMessage = 'Error Creating Book'
            }
        }
        res.render(`books/${form}`, params)
    } catch {
        res.redirect('/books')
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