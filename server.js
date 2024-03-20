const path = require('path')
const express = require('express')
const expressLayouts = require('express-ejs-layouts')
const app = express()
const morgan = require('morgan')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const methodOverride = require('method-override')
const passport = require('passport')
const session = require('express-session')
const MongoStore = require('connect-mongo')//(session)
const flash = require('express-flash')

const connectDB = require('./config/database');
const mainRouter = require('./routes/main')
const authorRouter = require('./routes/authors')
const bookRouter = require('./routes/books')
const authRouter = require('./routes/auth')
const dashboardRouter = require('./routes/dashboard')

// Use .env file in config folder
require("dotenv").config({ path: "./config/.env" });

// Passport config
require('./config/passport')(passport)

// Connect to Database
connectDB();

// Route Logging
app.use(morgan('dev'))

// Static Folder
app.use(express.static('public'));

// View Engine (EJS Template)
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', './layouts/layout');

app.use(bodyParser.urlencoded({ limit: '10mb', extended: false }))
app.use(bodyParser.json())
app.use(methodOverride('_method'))

// Sessions
app.use(session({
        secret: 'keyboard cat',
        resave: false,
        saveUninitialized: true,
        store: MongoStore.create({ mongoUrl: process.env.DB_STRING }),
        // cookie: { secure: true }
    })
)

// Passport middleware
app.use(passport.initialize())
app.use(passport.session())

app.use(flash())

app.use('/', mainRouter)
app.use('/authors', authorRouter)
app.use('/books', bookRouter)
app.use('/dashboard', dashboardRouter)

app.use('/auth', authRouter)

app.use(async (req, res) => {
    res.status(404).render('error/404', {
        title: '404',
        isAuth: req.isAuthenticated()
    })
})

app.listen(process.env.PORT || 8000, () => {
    console.log(`Server is running, you better catch it!`);
})
