const express = require('express')
const router = express.Router()
const Book = require('../models/book')
const Author = require('../models/author')
const imageMimeTypes = ['image/jpeg', 'image/png', 'images/gif']

// All Books Route
router.get('/', async (req, res) => {
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
        books: books,
        searchOptions: req.query
        })
    } catch {
        res.redirect('/')
    }
    // res.send('All Book')
})

// New Book Route
router.get('/new', async (req, res) => {
    renderNewPage(res, new Book())
    // res.send('New Book')
})

// Create Book Route
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

// Show Book Route
router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id).populate('author')
        .exec()
        res.render('books//show', { book: book })
    } catch (error) {
        res.redirect('/')
    }
})

// Edit Book Route 
router.get('/:id/edit', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
        renderEditPage(res, book)
    } catch (error) {
        res.redirect('/')
    }
})

async function renderNewPage(res, book, hasError = false){
    try {
        const authors = await Author.find({})
        const params = {
            authors: authors,
            book: book
        }
        if(hasError) params.errorMessage = 'Error Creating Book'
        res.render('books/new', params)
    } catch {
        res.redirect('/books')
    }
}

async function renderEditPage(res, book, hasError = false){
    try {
        const authors = await Author.find({})
        const params = {
            authors: authors,
            book: book
        }
        if(hasError) params.errorMessage = 'Error Creating Book'
        res.render('books/edit', params)
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