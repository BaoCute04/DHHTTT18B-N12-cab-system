import mongoose from 'mongoose';

const surgeZoneSchema = new mongoose.Schema({
    zoneId: { 
        type: String, 
        required: true, 
        unique: true 
    }, // Tên hoặc ID khu vực (VD: 'zone_quan1', 'zone_binhthanh')
    multiplier: { 
        type: Number, 
        default: 1.0 
    }, // Hệ số nhân (VD: mưa, kẹt xe -> 1.5)
    isActive: { 
        type: Boolean, 
        default: true 
    }
}, { 
    timestamps: true 
});

export default mongoose.model('SurgeZone', surgeZoneSchema);