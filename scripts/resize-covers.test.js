'use strict'

// Local check only. mongodb-memory-server never reads DB_STRING or config/.env.

const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const path = require('path')
const { describe, it, before, after } = require('node:test')
const mongoose = require('mongoose')
const sharp = require('sharp')
const { MongoMemoryServer } = require('mongodb-memory-server')

const Book = require('../models/book')
const {
    COVER_MAX_WIDTH,
    COVER_MAX_HEIGHT,
    MAX_COVER_INPUT_BYTES,
    asBuffer,
    encodeCover,
    planStoredCover,
} = require('../lib/coverImage')
const { run, parseArgs, BACKUP_COLLECTION } = require('./resize-covers')

const SCRIPT = path.join(__dirname, 'resize-covers.js')
const PAST = new Date('2020-01-01T00:00:00.000Z')

function noisy(width, height) {
    const raw = Buffer.allocUnsafe(width * height * 3)
    let n = 0x6d2b79f5
    for (let i = 0; i < raw.length; i++) {
        n = Math.imul(n ^ (n >>> 15), n | 1)
        n ^= n + Math.imul(n ^ (n >>> 7), n | 61)
        raw[i] = n >>> 24
    }
    return raw
}

async function encodeRaw(width, height, format, options) {
    let pipeline = sharp(noisy(width, height), {
        raw: { width, height, channels: 3 },
    })
    if (format === 'jpeg') pipeline = pipeline.jpeg(options)
    else if (format === 'png') pipeline = pipeline.png(options)
    else if (format === 'webp') pipeline = pipeline.webp(options)
    else throw new Error(`Unknown format: ${format}`)
    return pipeline.toBuffer()
}

function captureLog() {
    const lines = []
    return {
        lines,
        log(line) {
            lines.push(line)
            console.log(line)
        },
    }
}

async function withDb(uri, fn) {
    await mongoose.connect(uri)
    try {
        return await fn()
    } finally {
        await mongoose.disconnect()
    }
}

async function insertBook(title, buffer, mime) {
    const book = await Book.create({
        isbn: 9780000000001,
        title,
        publishDate: PAST,
        pageCount: 320,
        coverImage: buffer,
        coverImageType: mime,
        author: new mongoose.Types.ObjectId(),
    })
    await Book.collection.updateOne({ _id: book._id }, { $set: { updatedAt: PAST } })
    return book._id
}

// An empty buffer does not pass the schema (Mongoose treats it as missing).
// Store it the way an old document can exist: directly in the collection.
async function insertStored(title, buffer, mime) {
    const result = await Book.collection.insertOne({
        isbn: 9780000000001,
        title,
        publishDate: PAST,
        pageCount: 320,
        coverImage: buffer,
        coverImageType: mime,
        author: new mongoose.Types.ObjectId(),
        createdAt: PAST,
        updatedAt: PAST,
    })
    return result.insertedId
}

async function readCover(id) {
    const book = await Book.findById(id).select('coverImage coverImageType updatedAt title').lean()
    return {
        title: book.title,
        buffer: asBuffer(book.coverImage),
        mime: book.coverImageType,
        updatedAt: book.updatedAt,
    }
}

describe('parseArgs', () => {
    it('dry-run is the default and --apply is required to write', () => {
        const dry = parseArgs([])
        assert.equal(dry.dryRun, true)
        assert.equal(dry.apply, false)
        assert.equal(dry.restore, false)
        assert.equal(dry.limit, null)

        const flagged = parseArgs(['--dry-run', '--limit', '5'])
        assert.equal(flagged.dryRun, true)
        assert.equal(flagged.limit, 5)

        const apply = parseArgs(['--apply', '--limit=2', '--restore'])
        assert.equal(apply.apply, true)
        assert.equal(apply.dryRun, false)
        assert.equal(apply.restore, true)
        assert.equal(apply.limit, 2)
    })

    it('rejects conflicting and unknown arguments', () => {
        assert.throws(() => parseArgs(['--apply', '--dry-run']), /not both/)
        assert.throws(() => parseArgs(['--limit']), /non-negative integer/)
        assert.throws(() => parseArgs(['--limit', '-3']), /non-negative integer/)
        assert.throws(() => parseArgs(['--limit=nope']), /non-negative integer/)
        assert.throws(() => parseArgs(['--force']), /Unknown argument/)
    })
})

describe('planStoredCover', () => {
    it('reuses encodeCover and skips webp that already fits or would not shrink', async () => {
        const jpeg = await encodeRaw(900, 1200, 'jpeg', { quality: 90 })
        const planned = await planStoredCover(jpeg, 'image/jpeg')
        const encoded = await encodeCover(jpeg, 'image/jpeg')
        assert.equal(planned.action, 'resize')
        assert.equal(planned.nextMime, 'image/webp')
        assert.ok(planned.buffer.equals(encoded.buffer))
        assert.ok(planned.after < planned.before)
        assert.ok(planned.outWidth <= COVER_MAX_WIDTH)
        assert.ok(planned.outHeight <= COVER_MAX_HEIGHT)
        assert.ok(planned.outWidth === COVER_MAX_WIDTH || planned.outHeight === COVER_MAX_HEIGHT)

        const webp = await encodeRaw(480, 640, 'webp', { quality: 100 })
        const meta = await sharp(webp).metadata()
        assert.ok(meta.width <= COVER_MAX_WIDTH && meta.height <= COVER_MAX_HEIGHT)
        const kept = await planStoredCover(webp, 'image/webp')
        assert.equal(kept.action, 'skip')
        assert.equal(kept.reason, 'already-webp')
        const recompressed = await encodeCover(webp, 'image/webp')
        assert.ok(recompressed.buffer.length < webp.length)
        assert.equal(kept.after, webp.length)

        const smallPng = await sharp({
            create: { width: 64, height: 64, channels: 3, background: { r: 1, g: 2, b: 3 } },
        }).png().toBuffer()
        const pngPlan = await planStoredCover(smallPng, 'image/png')
        assert.equal(pngPlan.action, 'resize')
        assert.equal(pngPlan.nextMime, 'image/webp')
        assert.ok(pngPlan.width <= COVER_MAX_WIDTH && pngPlan.height <= COVER_MAX_HEIGHT)
        assert.ok(pngPlan.after < smallPng.length)

        const gif = await sharp({
            create: { width: 16, height: 16, channels: 3, background: { r: 255, g: 0, b: 0 } },
        }).gif().toBuffer()
        const unchanged = await planStoredCover(gif, 'image/gif')
        assert.equal(unchanged.action, 'skip')
        assert.equal(unchanged.reason, 'not-smaller')
        assert.ok(unchanged.after >= unchanged.before)

        const corrupt = await planStoredCover(Buffer.from('not-an-image'), 'image/jpeg')
        assert.equal(corrupt.action, 'skip')
        assert.equal(corrupt.reason, 'corrupt')

        const empty = await planStoredCover(Buffer.alloc(0), 'image/png')
        assert.equal(empty.reason, 'empty')

        const huge = await planStoredCover(Buffer.alloc(MAX_COVER_INPUT_BYTES + 1), 'image/jpeg')
        assert.equal(huge.reason, 'too-large')
    })
})

describe('stored cover migration', { timeout: 180000 }, () => {
    /** @type {import('mongodb-memory-server').MongoMemoryServer} */
    let mongod
    let uri
    let fixtures

    before(async () => {
        const [server, largeJpeg, largePng, inBoundsWebp, oversizedWebp] = await Promise.all([
            MongoMemoryServer.create(),
            encodeRaw(900, 1200, 'jpeg', { quality: 90 }),
            encodeRaw(900, 1200, 'png', { compressionLevel: 1 }),
            encodeRaw(480, 640, 'webp', { quality: 100 }),
            encodeRaw(1200, 1600, 'webp', { quality: 90 }),
        ])
        mongod = server
        uri = server.getUri()
        const solidGif = await sharp({
            create: { width: 16, height: 16, channels: 3, background: { r: 255, g: 0, b: 0 } },
        }).gif().toBuffer()
        fixtures = {
            largeJpeg,
            largePng,
            inBoundsWebp,
            oversizedWebp,
            solidGif,
            corrupt: Buffer.from('this is not an image'),
            empty: Buffer.alloc(0),
        }
    }, { timeout: 180000 })

    after(async () => {
        if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
        if (mongod) await mongod.stop()
    })

    it('dry-run prints sizes, --apply shrinks and backs up, restore puts the originals back', async () => {
        const ids = await withDb(uri, async () => {
            await mongoose.connection.dropDatabase()
            return {
                largeJpeg: await insertBook('Large JPEG', fixtures.largeJpeg, 'image/jpeg'),
                largePng: await insertBook('Large PNG', fixtures.largePng, 'image/png'),
                inBoundsWebp: await insertBook('In bounds WebP', fixtures.inBoundsWebp, 'image/webp'),
                oversizedWebp: await insertBook('Oversized WebP', fixtures.oversizedWebp, 'image/webp'),
                solidGif: await insertBook('Solid GIF', fixtures.solidGif, 'image/gif'),
                corrupt: await insertBook('Corrupt', fixtures.corrupt, 'image/jpeg'),
                empty: await insertStored('Empty', fixtures.empty, 'image/png'),
            }
        })

        const dryLog = captureLog()
        const dry = await run({ uri, log: dryLog.log })
        assert.equal(dry.mode, 'dry-run')
        assert.equal(dry.examined, 7)
        assert.equal(dry.resized, 3)
        assert.equal(dry.skipped, 4)
        assert.equal(dry.corrupt, 1)
        assert.equal(dry.errors, 0)
        const dryText = dryLog.lines.join('\n')
        assert.match(dryText, /already within 600x800/)
        assert.match(dryText, /is not smaller/)
        assert.match(dryText, /corrupt:/)
        assert.match(dryText, /empty cover/)
        const jpegPlan = dry.books.find((book) => book.title === 'Large JPEG')
        const pngPlan = dry.books.find((book) => book.title === 'Large PNG')
        const webpPlan = dry.books.find((book) => book.title === 'Oversized WebP')
        const keptPlan = dry.books.find((book) => book.title === 'In bounds WebP')
        assert.equal(jpegPlan.outWidth, 600)
        assert.equal(jpegPlan.outHeight, 800)
        assert.equal(pngPlan.outWidth, 600)
        assert.equal(pngPlan.outHeight, 800)
        assert.equal(webpPlan.outWidth, 600)
        assert.equal(webpPlan.outHeight, 800)
        console.log('COVER_RESIZE_RESULTS')
        console.log(`large-jpeg ${jpegPlan.width}x${jpegPlan.height} ${jpegPlan.mime} ${jpegPlan.before} -> ${jpegPlan.after} ${jpegPlan.nextMime} ${jpegPlan.outWidth}x${jpegPlan.outHeight}`)
        console.log(`large-png ${pngPlan.width}x${pngPlan.height} ${pngPlan.mime} ${pngPlan.before} -> ${pngPlan.after} ${pngPlan.nextMime} ${pngPlan.outWidth}x${pngPlan.outHeight}`)
        console.log(`oversized-webp ${webpPlan.width}x${webpPlan.height} ${webpPlan.mime} ${webpPlan.before} -> ${webpPlan.after} ${webpPlan.nextMime} ${webpPlan.outWidth}x${webpPlan.outHeight}`)
        console.log(`in-bounds-webp ${keptPlan.width}x${keptPlan.height} ${keptPlan.before} unchanged`)
        console.log(`solid-gif ${fixtures.solidGif.length} unchanged`)
        console.log(`corrupt ${fixtures.corrupt.length} unchanged`)
        console.log(`dry-run bytes ${dry.bytesBefore} -> ${dry.bytesAfter}`)
        assert.ok(dry.bytesAfter < dry.bytesBefore)
        assert.equal(dry.books.filter((book) => book.written).length, 0)

        await withDb(uri, async () => {
            for (const [name, id] of Object.entries(ids)) {
                const cover = await readCover(id)
                assert.equal(cover.updatedAt.getTime(), PAST.getTime(), name)
            }
            const jpeg = await readCover(ids.largeJpeg)
            assert.ok(jpeg.buffer.equals(fixtures.largeJpeg))
            assert.equal(jpeg.mime, 'image/jpeg')
            const backups = await mongoose.connection.db.collection(BACKUP_COLLECTION).countDocuments()
            assert.equal(backups, 0)
        })

        const applyLog = captureLog()
        const applied = await run({ uri, apply: true, log: applyLog.log })
        assert.equal(applied.mode, 'apply')
        assert.equal(applied.resized, 3)
        assert.equal(applied.errors, 0)
        assert.ok(applied.books.filter((book) => book.action === 'resize').every((book) => book.written))

        const resizedIds = [ids.largeJpeg, ids.largePng, ids.oversizedWebp]
        const afterFirst = await withDb(uri, async () => {
            const stored = {}
            for (const id of resizedIds) {
                const cover = await readCover(id)
                const meta = await sharp(cover.buffer).metadata()
                assert.equal(cover.mime, 'image/webp')
                assert.equal(meta.format, 'webp')
                assert.ok(meta.width <= COVER_MAX_WIDTH)
                assert.ok(meta.height <= COVER_MAX_HEIGHT)
                assert.ok(cover.buffer.length < (
                    id.equals(ids.largeJpeg) ? fixtures.largeJpeg.length
                        : id.equals(ids.largePng) ? fixtures.largePng.length
                            : fixtures.oversizedWebp.length
                ))
                assert.ok(cover.updatedAt.getTime() > PAST.getTime())
                stored[String(id)] = { bytes: cover.buffer.length, updatedAt: cover.updatedAt.getTime(), mime: cover.mime }
            }

            const keptWebp = await readCover(ids.inBoundsWebp)
            assert.ok(keptWebp.buffer.equals(fixtures.inBoundsWebp))
            assert.equal(keptWebp.mime, 'image/webp')
            assert.equal(keptWebp.updatedAt.getTime(), PAST.getTime())

            const solidGif = await readCover(ids.solidGif)
            assert.ok(solidGif.buffer.equals(fixtures.solidGif))
            assert.equal(solidGif.mime, 'image/gif')
            assert.equal(solidGif.updatedAt.getTime(), PAST.getTime())

            const corrupt = await readCover(ids.corrupt)
            assert.ok(corrupt.buffer.equals(fixtures.corrupt))
            assert.equal(corrupt.updatedAt.getTime(), PAST.getTime())

            const empty = await readCover(ids.empty)
            assert.ok(empty.buffer == null || empty.buffer.length === 0)
            assert.equal(empty.updatedAt.getTime(), PAST.getTime())

            const backups = await mongoose.connection.db.collection(BACKUP_COLLECTION).find({}).toArray()
            assert.equal(backups.length, 3)
            for (const backup of backups) {
                const key = String(backup.book)
                const original = key === String(ids.largeJpeg) ? fixtures.largeJpeg
                    : key === String(ids.largePng) ? fixtures.largePng
                        : fixtures.oversizedWebp
                const mime = key === String(ids.largeJpeg) ? 'image/jpeg'
                    : key === String(ids.largePng) ? 'image/png'
                        : 'image/webp'
                assert.ok(asBuffer(backup.coverImage).equals(original))
                assert.equal(backup.coverImageType, mime)
                assert.equal(backup.originalBytes, original.length)
            }
            return stored
        })

        const again = await run({ uri, apply: true, log: captureLog().log })
        assert.equal(again.resized, 0)
        assert.equal(again.errors, 0)

        await withDb(uri, async () => {
            for (const id of resizedIds) {
                const cover = await readCover(id)
                assert.equal(cover.buffer.length, afterFirst[String(id)].bytes)
                assert.equal(cover.updatedAt.getTime(), afterFirst[String(id)].updatedAt)
            }
            const backups = await mongoose.connection.db.collection(BACKUP_COLLECTION).find({}).toArray()
            assert.equal(backups.length, 3)
            const jpegBackup = backups.find((doc) => String(doc.book) === String(ids.largeJpeg))
            assert.ok(asBuffer(jpegBackup.coverImage).equals(fixtures.largeJpeg))
        })

        const restoreDry = await run({ uri, restore: true, log: captureLog().log })
        assert.equal(restoreDry.mode, 'restore-dry-run')
        assert.equal(restoreDry.restored, 3)
        assert.equal(restoreDry.errors, 0)

        await withDb(uri, async () => {
            const cover = await readCover(ids.largeJpeg)
            assert.equal(cover.mime, 'image/webp')
            assert.equal(cover.updatedAt.getTime(), afterFirst[String(ids.largeJpeg)].updatedAt)
        })

        const restored = await run({ uri, restore: true, apply: true, log: captureLog().log })
        assert.equal(restored.mode, 'restore')
        assert.equal(restored.restored, 3)
        assert.equal(restored.errors, 0)

        const afterRestore = await withDb(uri, async () => {
            const jpeg = await readCover(ids.largeJpeg)
            const png = await readCover(ids.largePng)
            const webp = await readCover(ids.oversizedWebp)
            assert.ok(jpeg.buffer.equals(fixtures.largeJpeg))
            assert.equal(jpeg.mime, 'image/jpeg')
            assert.ok(png.buffer.equals(fixtures.largePng))
            assert.equal(png.mime, 'image/png')
            assert.ok(webp.buffer.equals(fixtures.oversizedWebp))
            assert.equal(webp.mime, 'image/webp')
            assert.ok(jpeg.updatedAt.getTime() > afterFirst[String(ids.largeJpeg)].updatedAt)
            const backups = await mongoose.connection.db.collection(BACKUP_COLLECTION).countDocuments()
            assert.equal(backups, 3)
            return {
                jpegUpdatedAt: jpeg.updatedAt.getTime(),
            }
        })

        const restoreAgain = await run({ uri, restore: true, apply: true, log: captureLog().log })
        assert.equal(restoreAgain.restored, 0)
        assert.equal(restoreAgain.skipped, 3)

        await withDb(uri, async () => {
            const jpeg = await readCover(ids.largeJpeg)
            assert.equal(jpeg.updatedAt.getTime(), afterRestore.jpegUpdatedAt)
            assert.ok(jpeg.buffer.equals(fixtures.largeJpeg))
        })

        await run({ uri, apply: true, log: captureLog().log })

        await withDb(uri, async () => {
            const jpeg = await readCover(ids.largeJpeg)
            const meta = await sharp(jpeg.buffer).metadata()
            assert.equal(jpeg.mime, 'image/webp')
            assert.equal(meta.format, 'webp')
            assert.ok(jpeg.buffer.length < fixtures.largeJpeg.length)
            assert.ok(jpeg.updatedAt.getTime() > afterRestore.jpegUpdatedAt)
            const backups = await mongoose.connection.db.collection(BACKUP_COLLECTION).find({}).toArray()
            assert.equal(backups.length, 3)
            const jpegBackup = backups.find((doc) => String(doc.book) === String(ids.largeJpeg))
            assert.ok(asBuffer(jpegBackup.coverImage).equals(fixtures.largeJpeg))
            assert.equal(jpegBackup.coverImageType, 'image/jpeg')
        })

    })

    it('limits how many books are visited and does not connect without DB_STRING', async () => {
        await withDb(uri, async () => {
            await mongoose.connection.dropDatabase()
            await insertBook('One', fixtures.largeJpeg, 'image/jpeg')
            await insertBook('Two', fixtures.largeJpeg, 'image/jpeg')
            await insertBook('Three', fixtures.largeJpeg, 'image/jpeg')
        })

        const limited = await run({ uri, apply: true, limit: 1, log: captureLog().log })
        assert.equal(limited.examined, 1)
        assert.equal(limited.resized, 1)

        await withDb(uri, async () => {
            const books = await Book.find().sort({ _id: 1 }).select('coverImage coverImageType title updatedAt').lean()
            assert.equal(books.length, 3)
            assert.equal(books[0].coverImageType, 'image/webp')
            assert.ok(books[0].updatedAt.getTime() > PAST.getTime())
            assert.equal(books[1].coverImageType, 'image/jpeg')
            assert.equal(books[1].updatedAt.getTime(), PAST.getTime())
            assert.equal(books[2].coverImageType, 'image/jpeg')
            const backups = await mongoose.connection.db.collection(BACKUP_COLLECTION).countDocuments()
            assert.equal(backups, 1)
        })

        const help = spawnSync(process.execPath, [SCRIPT, '--help'], {
            encoding: 'utf8',
            timeout: 15000,
        })
        assert.equal(help.status, 0)
        assert.match(help.stdout, /dry-run/)
        assert.doesNotMatch(help.stdout, /cover resize:/)

        const missing = spawnSync(process.execPath, [SCRIPT], {
            encoding: 'utf8',
            timeout: 5000,
            env: { ...process.env, DB_STRING: '' },
        })
        assert.equal(missing.status, 1)
        assert.match(missing.stderr, /DB_STRING is missing/)
        assert.equal(missing.stdout, '')
    })
})
