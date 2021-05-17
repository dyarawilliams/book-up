const express = require('express')
const router = express.Router()
const Author = require('../models/author')

// All Authors
router.get('/', (req, res) => {
    res.render('authors/index')
})

// New Author
router.get('/new', (req, res) => {
    res.render('authors/new', { author: new Author() })
})

// Create Author 
router.post('/', (req, res) => {
    const newAuthor = new Author({
        name: req.body.name
    })
    author.save((err, newAuthor) => {
        if(err) {
            res.render('authors/new', {
                author: author,
                errorMessage: 'Error creating Author'
            })
        } else {
            // res.redirect(`authors/${newAuthor.id}`)
            res.redirect('authors')
        }
    })
    // res.send(req.body.name)
})


module.exports = router