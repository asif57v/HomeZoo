import mongoose from 'mongoose';

const newsArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Article title is required'],
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Short description is required'],
    trim: true,
    maxlength: 500
  },
  content: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    default: 'Market Insights',
    trim: true
  },
  image: {
    type: String,
    required: [true, 'Cover image is required'],
    trim: true
  },
  readTime: {
    type: String,
    default: '5 min read',
    trim: true
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  priority: {
    type: Number,
    default: 0
  },
  publishedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Auto-generate slug before saving
newsArticleSchema.pre('save', function (next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + '-' + Date.now().toString(36);
  }
  next();
});

const NewsArticle = mongoose.model('NewsArticle', newsArticleSchema);
export default NewsArticle;
