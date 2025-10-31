const express = require('express')
const router = express.Router()
const Book = require('../models/book')
const Author = require('../models/author')
const User = require('../models/user')
const imageMimeTypes = ['image/jpeg', 'image/png', 'images/gif']
const genres = require('../config/genres')
const { ensureAuth, ensureGuest } = require('../middleware/auth')

const booksController = require('../controller/books')

// @desc All Books
// @route GET /books/
router.get('/', booksController.getBooks)

// @desc New Book 
// @route GET /books/new
router.get('/new', ensureAuth, async (req, res) => {
    try {
        renderNewPage(req, res, new Book())
    } catch (err) {
        console.error(err)
        res.redirect('/')
    }
})

// @desc Create Book
// @route POST /books/
router.post('/', ensureAuth, booksController.createBook)

// // @desc Show Book 
// // @route GET /books/:id
router.get('/:id', booksController.showBook)

// @desc Edit Book 
// @route GET /books/:id/edit
router.get('/:id/edit', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id)
        renderEditPage(req, res, book)
    } catch (err) {
        console.error(err)
        res.redirect('/')
    }
})

// @desc Update Book 
// @route PUT /books/:id 
router.put('/:id', ensureAuth, booksController.updateBook)

// @desc Delete Book 
// @route GET /books/:id
router.delete('/:id', ensureAuth, booksController.deleteBook)


// This function is responsible for rendering a page to create a new book.
async function renderNewPage(req, res, book, hasError = false){
    await renderFormPage(req, res, book, 'new', hasError)
}

// This function is responsible for rendering a page to edit an existing book.
async function renderEditPage(req, res, book, hasError = false){
    await renderFormPage(req, res, book, 'edit', hasError)
}

// This function is a general-purpose function to render form pages for creating or editing books.
async function renderFormPage(req, res, book, form, hasError = false){
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
        if(hasError) {
            params.errorMessage = form === 'edit' ? 'Error Updating Book' : 'Error Creating Book';
        }
        res.render(`books/${form}`, params)
    } catch(err) {
        console.error(err)
        res.redirect('/books')
    }
}

module.exports = router
