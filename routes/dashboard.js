const express = require('express')
const router = express.Router()
const { ensureAuth } = require('../middleware/auth')
const imageMimeTypes = ['image/jpeg', 'image/png', 'images/gif']

const Book = require('../models/book')
const Author = require('../models/author')
const User = require('../models/user')

const dashboardController = require('../controller/dashboard')
const authorController = require('../controller/author')

// @desc Dashboard
// @route GET /dashboard
router.get('/', ensureAuth, dashboardController.getIndex)

// @desc All Books
// @route GET /dashboard/books/
router.get('/books', dashboardController.getBooks)

// @desc New Book 
// @route GET /dashboard/books/new
router.get('/books/new', ensureAuth, async (req, res) => {
    renderNewPage(req, res, new Book())
    // res.send('New Book')
})

// @desc Create Book
// @route POST /dashboard/books/
router.post('/books', dashboardController.createBook)

// @desc Show Book 
// @route GET /dashboard/books/:id
router.get('/books/:id', dashboardController.showBook)

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
router.put('/books/:id', ensureAuth, dashboardController.updateBook)

// @desc Delete Book 
// @route GET /dashboard/books/:id
router.delete('/books/:id', ensureAuth, dashboardController.deleteBook)

// @desc Books Added
// @route Get /dashboard/books/mybooks
// router.get('/mybooks', async (req, res) => {
//     let query = Book.find()

//     try {
//         const books = await query.exec()
//         res.render('books/show-added', {
//             layout: 'layouts/dashboard',
//             title: 'My Books Added',
//             user: req.user,
//             isAuth: req.isAuthenticated(),
//             books: books
//         })
//     } catch (err) {
//         console.error(err)
//     }
// })

// @desc New Author
// @route GET /dashboard/authors/new
router.get('/authors/new', ensureAuth, authorController.newAuthor)

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