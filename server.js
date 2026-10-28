const path = require('path')
const express = require('express')
const expressLayouts = require('express-ejs-layouts')
const app = express()
const morgan = require('morgan')
const methodOverride = require('method-override')
const passport = require('passport')
const session = require('express-session')
const { MongoStore } = require('connect-mongo')
const flash = require('express-flash')
const compression = require('compression')

const connectDB = require('./config/database');
const mainRouter = require('./routes/main')
const authorRouter = require('./routes/authors')
const bookRouter = require('./routes/books')
const authRouter = require('./routes/auth')
const dashboardRouter = require('./routes/dashboard')

// Use .env file in config folder
require("dotenv").config({ path: "./config/.env", quiet: true });

if (!process.env.SESSION_SECRET) {
    console.error('SESSION_SECRET is missing. Add a long random SESSION_SECRET to config/.env and restart.')
    process.exit(1)
}

// Passport config
require('./config/passport')(passport)

// Connect to Database
connectDB();

// Path only: never log query strings (OAuth callback codes included).
morgan.token('pathname', (req) => {
    const url = req.originalUrl || req.url || '-'
    const queryIndex = url.indexOf('?')
    return queryIndex === -1 ? url : url.slice(0, queryIndex)
})
app.use(morgan(':method :pathname :status :response-time ms - :res[content-length]'))

// Compress before static files so CSS, JS, and fonts are gzipped with HTML.
app.use(compression())

// Static Folder. Production responses stay cacheable for repeat visits.
const staticMaxAge = process.env.NODE_ENV === 'production' ? '30d' : 0
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: staticMaxAge,
    etag: true,
}))

// View Engine (EJS Template)
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', './layouts/layout');
// Keep Express 4 query behavior. Express 5 defaults to the "simple" parser.
app.set('query parser', 'extended')

app.use(express.urlencoded({ limit: '10mb', extended: false }))
app.use(express.json())
app.use((req, res, next) => {
    if (req.body == null) req.body = {}
    next()
})
app.use(methodOverride('_method'))

if (process.env.NODE_ENV === 'production') {
    // One hop so Secure cookies see HTTPS behind a reverse proxy.
    app.set('trust proxy', 1)
}

// Sessions
app.use(session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: MongoStore.create({ mongoUrl: process.env.DB_STRING }),
        cookie: {
            maxAge: 3600000, // 1 hour
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        }
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

app.use((req, res) => {
    const isAuth = typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false
    res.status(404).render('error/404', {
        title: '404',
        isAuth,
    })
})

app.use((err, req, res, next) => {
    console.error(err && err.stack ? err.stack : err)
    if (res.headersSent) {
        return next(err)
    }
    const statusCode = Number(err.status || err.statusCode)
    const status = Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600 ? statusCode : 500
    const isAuth = typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : false
    res.status(status).render('error/500', {
        title: 'Server Error',
        status,
        isAuth,
    }, (renderErr, html) => {
        if (renderErr || typeof html !== 'string') {
            console.error(renderErr && renderErr.stack ? renderErr.stack : renderErr)
            if (!res.headersSent) {
                res.status(500).type('text').send('Internal Server Error')
            }
            return
        }
        res.send(html)
    })
})

app.listen(process.env.PORT || 8000, () => {
    console.log(`Server is running, you better catch it!`);
})
