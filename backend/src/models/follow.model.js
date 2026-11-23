const mongoose = require('mongoose');

const followSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    foodPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'foodPartner',
        required: true
    }
}, {
    timestamps: true
})

followSchema.index({ user: 1, foodPartner: 1 }, { unique: true })

const follow = mongoose.model('follow', followSchema)
module.exports = follow
