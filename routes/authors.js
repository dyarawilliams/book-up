const express = require('express')
const router = express.Router()
const Author = require('../models/author')
const Book = require('../models/book')

// @desc All Authors
// @route GET /authors/
router.get('/', async (req, res) => {
    let searchOptions = {}
    if(req.query.name != null && req.query.name != '') {
        searchOptions.name = new RegExp(req.query.name, 'i')
    }
    try {
        const authors = await Author.find(searchOptions)
        res.render('authors/index', { 
            authors: authors,
            searchOptions: req.query 
        })
    } catch (err) {
        res.redirect('/')
        console.log(err)
    }
})

// @desc New Authors
// @route GET /authors/new
router.get('/new', (req, res) => {
    res.render('authors/new', { author: new Author() })
})

// @desc Create Authors
// @route POST /authors/
router.post('/', async (req, res) => {
    const author = new Author({
        name: req.body.name
    })
    try {
        const newAuthor = await author.save()
        res.redirect(`authors/${newAuthor.id}`)
    } catch (err) {
        res.render('authors/new', {
            author: author,
            errorMessage: 'Error creating Author'
        })
        console.log(err)
    }
})

// @desc Show Author
// @route GET /authors/:id
router.get('/:id', async (req, res) => {
    try {
        const author = await Author.findById(req.params.id)
        const books = await Book.find({ author: author.id }).limit(6).exec()
        res.render('authors/show', {
            author: author,
            booksByAuthor: books
        })
    } catch (err) {
        console.log(err)
        res.redirect('/')
    }
})

// @desc Edit Author
// @route GET /authors/:id/edit
router.get('/:id/edit', async (req, res) => {
    try {
        // finds author by Id if it exists 
        const author = await Author.findById(req.params.id)
        res.render('authors/edit', { author: author })
    } catch (err) {
        console.log(err)
        // Redirects user back to authors index page 
        res.redirect('/authors')
    }
})

// @desc Update Author
// @route PUT /authors/:id
router.put('/:id', async (req, res) => {
    let author
    try {
        author = await Author.findById(req.params.id)
        author.name = req.body.name
        await author.save()
        res.redirect(`/authors/${author.id}`)
    } catch (err) {
        if(author == null) {
            res.redirect('/')
        } else {
            res.render('authors/edit', {
            author: author,
            errorMessage: 'Error updating Author'
            })
        }
    }
})

// @desc Delete Author
// @route DELETE /authors/:id/
router.delete('/:id', async (req, res) => {
    let author
    try {
        author = await Author.findById(req.params.id)
        await author.remove()
        res.redirect('/authors')
    } catch (err) {
        if(author == null) {
            res.redirect('/')
        } else {
            res.redirect(`/authors/${author.id}`)
        }
    }
    // res.send('Delete Author ' + req.params.id)
})

module.exports = router