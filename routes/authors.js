const express = require('express')
const router = express.Router()

// All Authors
router.get('/', (req, res) => {
    res.render('authors/index')
})

// New Author
router.get('/new', (req, res) => {
    res.render('authors/new')
})

// Create Author 
router.post('/', (req, res) => {
    res.send('Created new author')
})


module.exports = router