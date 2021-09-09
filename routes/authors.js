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
        // res.redirect(`authors/${newAuthor.id}`)
        res.redirect('authors')
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
router.get('/:id/edit', (req, res) => {
    res.send('Edit Author ' + req.params.id)
})

router.put('/:id', (req, res) => {
    res.send('Update Author ' + req.params.id)
})

router.delete('/:id', (req, res) => {
    res.send('Delete Author ' + req.params.id)
})

module.exports = router