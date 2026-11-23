const mongoose = require('mongoose');

const reportedContentSchema = new mongoose.Schema({
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    contentType: {
        type: String,
        enum: ['reel', 'comment'],
        required: true
    },
    reel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'food'
    },
    comment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'comment'
    },
    reason: {
        type: String,
        enum: ['spam', 'inappropriate', 'false_information', 'harassment', 'other'],
        required: true
    },
    details: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    status: {
        type: String,
        enum: ['open', 'reviewed', 'resolved'],
        default: 'open'
    }
}, {
    timestamps: true
})

reportedContentSchema.index(
    { reporter: 1, contentType: 1, reel: 1, comment: 1 },
    { unique: true, sparse: true }
)

const reportedContent = mongoose.model('reportedContent', reportedContentSchema)
module.exports = reportedContent