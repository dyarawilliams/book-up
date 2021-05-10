const express = require('express')
const app = express()
const expressLayouts = require('express-ejs-layouts')
const mongoose = require('mongoose')
const connectDB = require("./config/database");

const mainRouter = require('./routes/main')


// Use .env file in config folder
require("dotenv").config({ path: "./config/.env" });

// Connect to Database
connectDB()


// Using ejs for views
app.set('view engine', 'ejs')
app.set('views', __dirname + '/views')
app.set('layout', 'layouts/layout')
app.use(expressLayouts)

// Static Folder
app.use(express.static('public'))


app.use('/', mainRouter)

app.listen(process.env.PORT || 8000,  () => {
    console.log(`Server is running, you better catch it!`)
})