#!/usr/bin/env node
'use strict'

// Shrink Book.coverImage values already stored in MongoDB.
// Default is a dry run. --apply copies each original into coverbackups, then
// replaces it. --restore puts those backups back. Reads DB_STRING from
// config/.env (same file as the app) or from the environment.

const path = require('path')
const mongoose = require('mongoose')
require('dotenv').config({
    path: path.join(__dirname, '..', 'config', '.env'),
    quiet: true,
})

const Book = require('../models/book')
const {
    COVER_MAX_WIDTH,
    COVER_MAX_HEIGHT,
    asBuffer,
    planStoredCover,
} = require('../lib/coverImage')

const BATCH_SIZE = 10
const BACKUP_COLLECTION = 'coverbackups'

const coverBackupSchema = new mongoose.Schema({
    book: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        unique: true,
    },
    coverImage: {
        type: Buffer,
        required: true,
    },
    coverImageType: {
        type: String,
        required: true,
    },
    originalBytes: {
        type: Number,
        required: true,
    },
}, {
    collection: BACKUP_COLLECTION,
    timestamps: true,
})

function getCoverBackupModel() {
    return mongoose.models.CoverBackup || mongoose.model('CoverBackup', coverBackupSchema)
}

function parseArgs(argv) {
    const out = {
        apply: false,
        restore: false,
        limit: null,
        help: false,
        dryRunFlag: false,
    }
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i]
        if (arg === '--apply') {
            out.apply = true
        } else if (arg === '--dry-run') {
            out.dryRunFlag = true
        } else if (arg === '--restore') {
            out.restore = true
        } else if (arg === '--help' || arg === '-h') {
            out.help = true
        } else if (arg === '--limit' || arg.startsWith('--limit=')) {
            const raw = arg === '--limit' ? argv[++i] : arg.slice('--limit='.length)
            if (raw == null || !/^\d+$/.test(raw)) {
                throw new Error('--limit requires a non-negative integer')
            }
            out.limit = Number(raw)
        } else {
            throw new Error(`Unknown argument: ${arg}`)
        }
    }
    if (out.apply && out.dryRunFlag) {
        throw new Error('Use either --apply or --dry-run, not both')
    }
    out.dryRun = !out.apply
    return out
}

function usage() {
    console.log(`Usage: npm run covers:resize -- [options]

Resize book covers already stored in MongoDB (coverImage + coverImageType).
Reads DB_STRING from config/.env, or from the environment when that file is absent.
Uses the upload encoder: fit inside ${COVER_MAX_WIDTH}x${COVER_MAX_HEIGHT}, WebP.

Options:
  --dry-run       Print before/after sizes and write nothing (default)
  --apply         Back up each original into ${BACKUP_COLLECTION}, then replace it
  --restore       Put backed-up covers back. Combine with --apply to write
  --limit <n>     Only visit the first n books (or backups, with --restore)
  --help          Show this help

Examples:
  npm run covers:resize
  npm run covers:resize -- --limit 5
  npm run covers:resize -- --apply
  npm run covers:resize -- --restore
  npm run covers:resize -- --restore --apply
`)
}

function createSummary(mode) {
    return {
        mode,
        examined: 0,
        resized: 0,
        restored: 0,
        skipped: 0,
        corrupt: 0,
        errors: 0,
        bytesBefore: 0,
        bytesAfter: 0,
        books: [],
    }
}

function bookLabel(id, title) {
    const clean = typeof title === 'string' ? title.replace(/\s+/g, ' ').trim() : ''
    return clean ? `${id} ${JSON.stringify(clean)}` : String(id)
}

function formatSummary(summary) {
    const delta = summary.bytesBefore - summary.bytesAfter
    const change = delta >= 0 ? `saved ${delta}` : `grew ${Math.abs(delta)}`
    let acted = ''
    switch (summary.mode) {
        case 'apply':
            acted = `resized ${summary.resized}`
            break
        case 'dry-run':
            acted = `would resize ${summary.resized}`
            break
        case 'restore':
            acted = `restored ${summary.restored}`
            break
        case 'restore-dry-run':
            acted = `would restore ${summary.restored}`
            break
        default: {
            const unknown = summary.mode
            throw new Error(`Unknown summary mode: ${unknown}`)
        }
    }
    return `examined ${summary.examined}, ${acted}, skipped ${summary.skipped}, corrupt ${summary.corrupt}, errors ${summary.errors}, bytes ${summary.bytesBefore} -> ${summary.bytesAfter} (${change})`
}

function formatSkip(id, title, plan) {
    const label = bookLabel(id, title)
    const dims = plan.width && plan.height ? ` ${plan.width}x${plan.height}` : ''
    if (plan.reason === 'already-webp') {
        return `skip ${label} ${plan.before} B image/webp${dims} already within ${COVER_MAX_WIDTH}x${COVER_MAX_HEIGHT}`
    }
    if (plan.reason === 'not-smaller') {
        const mime = plan.mime || 'unknown'
        return `skip ${label} ${plan.before} B ${mime}${dims} output ${plan.after} B is not smaller`
    }
    if (plan.reason === 'empty') {
        return `skip ${label} empty cover`
    }
    if (plan.reason === 'too-large') {
        return `skip ${label} ${plan.before} B exceeds the upload size limit`
    }
    if (plan.reason === 'corrupt') {
        return `skip ${label} corrupt: ${plan.message || 'unreadable image'}`
    }
    return `skip ${label} ${plan.reason || 'unchanged'}`
}

function formatResize(id, title, plan) {
    const dims = plan.width && plan.height ? ` ${plan.width}x${plan.height}` : ''
    const outDims = plan.outWidth && plan.outHeight ? ` ${plan.outWidth}x${plan.outHeight}` : ''
    const mime = plan.mime || 'unknown'
    return `resize ${bookLabel(id, title)} ${plan.before} B ${mime}${dims} -> ${plan.after} B ${plan.nextMime}${outDims}`
}

function isDuplicateKey(err) {
    if (!err || typeof err !== 'object') return false
    if (err.code === 11000) return true
    if (err.cause && err.cause.code === 11000) return true
    return Boolean(err.errorResponse && err.errorResponse.code === 11000)
}

function safeError(err) {
    const message = err instanceof Error ? err.message : String(err)
    return message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, 'mongodb://[redacted]')
}

// Insert the original once. A later --apply must not overwrite the first backup
// with already-resized bytes.
async function writeBackup(CoverBackup, bookId, buffer, mime) {
    try {
        await CoverBackup.create({
            book: bookId,
            coverImage: buffer,
            coverImageType: typeof mime === 'string' ? mime : '',
            originalBytes: buffer.length,
        })
    } catch (err) {
        if (isDuplicateKey(err)) return
        throw err
    }
}

async function withCursor(cursor, fn) {
    try {
        await fn(cursor)
    } finally {
        try {
            await cursor.close()
        } catch {
            // The for-await break already closed it.
        }
    }
}

function pushBook(summary, record) {
    summary.books.push(record)
}

async function resizeCovers({ apply, limit, log }) {
    const mode = apply ? 'apply' : 'dry-run'
    const summary = createSummary(mode)
    log(apply
        ? `cover resize: apply (backup into ${BACKUP_COLLECTION}, then replace)`
        : 'cover resize: dry-run (no writes; pass --apply to write)')

    if (limit === 0) {
        log(formatSummary(summary))
        return summary
    }

    const CoverBackup = getCoverBackupModel()
    if (apply) await CoverBackup.init()

    // Batches of books, projection limited to the cover buffer plus the type and title for the log.
    const cursor = Book.find()
        .sort({ _id: 1 })
        .select('coverImage coverImageType title')
        .lean()
        .cursor({ batchSize: BATCH_SIZE })

    await withCursor(cursor, async (books) => {
        for await (const doc of books) {
            if (limit != null && summary.examined >= limit) break
            summary.examined++
            await visitBook(doc, { apply, summary, log, CoverBackup })
        }
    })

    log(formatSummary(summary))
    return summary
}

async function visitBook(doc, { apply, summary, log, CoverBackup }) {
    const id = String(doc._id)
    const title = doc.title || ''
    const beforeBuf = asBuffer(doc.coverImage)
    const beforeMime = typeof doc.coverImageType === 'string' ? doc.coverImageType : ''
    const plan = await planStoredCover(beforeBuf, beforeMime)

    if (plan.action === 'resize' && (!plan.buffer || plan.buffer.length >= (beforeBuf ? beforeBuf.length : 0))) {
        plan.action = 'skip'
        plan.reason = 'not-smaller'
        plan.after = plan.buffer ? plan.buffer.length : plan.before
    }

    if (plan.action === 'skip') {
        summary.skipped++
        if (plan.reason === 'corrupt') summary.corrupt++
        const before = plan.before || 0
        summary.bytesBefore += before
        summary.bytesAfter += before
        log(formatSkip(id, title, plan))
        pushBook(summary, {
            id,
            title,
            action: 'skip',
            reason: plan.reason || '',
            before,
            after: before,
            mime: plan.mime || beforeMime,
            nextMime: plan.nextMime || '',
            width: plan.width || 0,
            height: plan.height || 0,
            outWidth: 0,
            outHeight: 0,
            written: false,
        })
        return
    }

    const record = {
        id,
        title,
        action: 'resize',
        reason: '',
        before: plan.before,
        after: plan.after,
        mime: plan.mime || beforeMime,
        nextMime: plan.nextMime,
        width: plan.width || 0,
        height: plan.height || 0,
        outWidth: plan.outWidth || 0,
        outHeight: plan.outHeight || 0,
        written: false,
    }
    if (!apply) {
        log(formatResize(id, title, plan))
        summary.resized++
        summary.bytesBefore += plan.before
        summary.bytesAfter += plan.after
        pushBook(summary, record)
        return
    }

    try {
        await writeBackup(CoverBackup, doc._id, beforeBuf, beforeMime)
        // updatedAt feeds Last-Modified and the ?v= cache buster on the cover URL.
        // The new bytes change the ETag. Set the timestamp explicitly so a long-cached
        // cover is requested again even if mongoose timestamps are skipped.
        const updatedAt = new Date()
        const result = await Book.updateOne(
            { _id: doc._id },
            {
                $set: {
                    coverImage: plan.buffer,
                    coverImageType: plan.nextMime,
                    updatedAt,
                },
            },
            { timestamps: false }
        )
        if (result.matchedCount !== 1) {
            throw new Error('book disappeared before update')
        }
        record.written = true
        summary.resized++
        summary.bytesBefore += plan.before
        summary.bytesAfter += plan.after
        log(formatResize(id, title, plan))
    } catch (err) {
        summary.errors++
        record.action = 'error'
        record.reason = safeError(err)
        log(`error ${bookLabel(id, title)} write failed: ${record.reason}`)
        console.error(record.reason)
    }
    pushBook(summary, record)
}

async function restoreCovers({ apply, limit, log }) {
    const mode = apply ? 'restore' : 'restore-dry-run'
    const summary = createSummary(mode)
    log(apply
        ? `cover restore: apply (write ${BACKUP_COLLECTION} back onto books)`
        : 'cover restore: dry-run (no writes; pass --restore --apply to write)')

    if (limit === 0) {
        log(formatSummary(summary))
        return summary
    }

    const CoverBackup = getCoverBackupModel()
    if (apply) await CoverBackup.init()

    const cursor = CoverBackup.find()
        .sort({ _id: 1 })
        .select('book coverImage coverImageType')
        .lean()
        .cursor({ batchSize: BATCH_SIZE })

    await withCursor(cursor, async (backups) => {
        for await (const doc of backups) {
            if (limit != null && summary.examined >= limit) break
            summary.examined++
            await visitBackup(doc, { apply, summary, log })
        }
    })

    log(formatSummary(summary))
    return summary
}

async function visitBackup(doc, { apply, summary, log }) {
    const bookId = doc.book
    const id = String(bookId)
    const backupBuf = asBuffer(doc.coverImage)
    const backupMime = typeof doc.coverImageType === 'string' ? doc.coverImageType : ''
    if (!backupBuf || backupBuf.length === 0) {
        summary.skipped++
        summary.corrupt++
        log(`skip ${id} backup is empty`)
        pushBook(summary, {
            id,
            title: '',
            action: 'skip',
            reason: 'empty-backup',
            before: 0,
            after: 0,
            mime: backupMime,
            nextMime: backupMime,
            width: 0,
            height: 0,
            outWidth: 0,
            outHeight: 0,
            written: false,
        })
        return
    }

    const book = await Book.findById(bookId).select('coverImage coverImageType title').lean()
    if (!book) {
        summary.skipped++
        log(`skip ${id} missing book for backup`)
        pushBook(summary, {
            id,
            title: '',
            action: 'skip',
            reason: 'missing-book',
            before: 0,
            after: backupBuf.length,
            mime: '',
            nextMime: backupMime,
            width: 0,
            height: 0,
            outWidth: 0,
            outHeight: 0,
            written: false,
        })
        return
    }

    const current = asBuffer(book.coverImage)
    const currentMime = typeof book.coverImageType === 'string' ? book.coverImageType : ''
    const sameBytes = Boolean(current && current.length === backupBuf.length && current.equals(backupBuf))
    const sameType = currentMime === backupMime
    const title = book.title || ''
    if (sameBytes && sameType) {
        summary.skipped++
        summary.bytesBefore += backupBuf.length
        summary.bytesAfter += backupBuf.length
        log(`skip ${bookLabel(id, title)} already matches backup (${backupBuf.length} B ${backupMime})`)
        pushBook(summary, {
            id,
            title,
            action: 'skip',
            reason: 'already-restored',
            before: backupBuf.length,
            after: backupBuf.length,
            mime: currentMime,
            nextMime: backupMime,
            width: 0,
            height: 0,
            outWidth: 0,
            outHeight: 0,
            written: false,
        })
        return
    }

    const before = current ? current.length : 0
    log(`restore ${bookLabel(id, title)} ${before} B ${currentMime || 'unknown'} -> ${backupBuf.length} B ${backupMime}`)
    const record = {
        id,
        title,
        action: 'restore',
        reason: '',
        before,
        after: backupBuf.length,
        mime: currentMime,
        nextMime: backupMime,
        width: 0,
        height: 0,
        outWidth: 0,
        outHeight: 0,
        written: false,
    }

    if (!apply) {
        summary.restored++
        summary.bytesBefore += before
        summary.bytesAfter += backupBuf.length
        pushBook(summary, record)
        return
    }

    try {
        const updatedAt = new Date()
        const result = await Book.updateOne(
            { _id: bookId },
            {
                $set: {
                    coverImage: backupBuf,
                    coverImageType: backupMime,
                    updatedAt,
                },
            },
            { timestamps: false }
        )
        if (result.matchedCount !== 1) {
            throw new Error('book disappeared before restore')
        }
        record.written = true
        summary.restored++
        summary.bytesBefore += before
        summary.bytesAfter += backupBuf.length
    } catch (err) {
        summary.errors++
        record.action = 'error'
        record.reason = safeError(err)
        log(`error ${bookLabel(id, title)} restore failed: ${record.reason}`)
        console.error(record.reason)
    }
    pushBook(summary, record)
}

async function run(options = {}) {
    const apply = Boolean(options.apply)
    const restore = Boolean(options.restore)
    const limit = options.limit == null ? null : options.limit
    const log = options.log || console.log
    const uri = options.uri || process.env.DB_STRING
    if (!uri) {
        throw new Error('DB_STRING is missing. Add it to config/.env or set it in the environment.')
    }
    if (limit != null && (!Number.isInteger(limit) || limit < 0)) {
        throw new Error('--limit requires a non-negative integer')
    }

    mongoose.set('strictQuery', true)
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })
    try {
        if (restore) return await restoreCovers({ apply, limit, log })
        return await resizeCovers({ apply, limit, log })
    } finally {
        await mongoose.disconnect()
    }
}

async function main() {
    let args
    try {
        args = parseArgs(process.argv.slice(2))
    } catch (err) {
        console.error(err instanceof Error ? err.message : String(err))
        console.error('Run with --help for usage.')
        process.exit(1)
    }
    if (args.help) {
        usage()
        return
    }
    try {
        const summary = await run(args)
        if (summary.errors > 0) process.exitCode = 1
    } catch (err) {
        console.error(safeError(err))
        process.exit(1)
    }
}

if (require.main === module) {
    main()
}

module.exports = {
    run,
    parseArgs,
    BACKUP_COLLECTION,
    BATCH_SIZE,
}
