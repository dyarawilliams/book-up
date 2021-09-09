const express = require('express')
const router = express.Router()
const Author = require('../models/author')

// All Authors
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

// New Author
router.get('/new', (req, res) => {
    res.render('authors/new', { author: new Author() })
})

// Create Author
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

// Showing User 
router.get('/:id', (req, res) => {
    res.send('Show Author ' + req.params.id)
})

// Edit page
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

// Updates Author from edit page
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

// Deletes an Author
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