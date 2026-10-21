import NewsArticle from '../models/NewsArticle.js';
import { uploadToCloudinary } from '../utils/cloudinary.js';

// Seed initial articles if collection is completely empty
const seedDefaultArticles = async () => {
  try {
    const count = await NewsArticle.countDocuments();
    if (count === 0) {
      await NewsArticle.insertMany([
        {
          title: "Why Residential Plots Are Overperforming Urban Apartments in 2026",
          description: "An in-depth market analysis revealing how smart infrastructure improvements and express highway corridors are fueling record returns in land investment.",
          content: "Across India's rapidly expanding commercial corridors, residential plot investments are delivering unprecedented annual yields. Rapid infrastructure projects, high-speed metro lines, and green corridor masterplans have shifted investor interest from high-density multi-story apartments to independent plots. Investors value the long-term capital appreciation, complete freehold ownership, and freedom of customized architectural construction.",
          category: "Market Insights",
          image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
          readTime: "5 min read",
          isPublished: true,
          isFeatured: true,
          priority: 1
        },
        {
          title: "Essential Legal Checklist Before Investing in Agricultural & Residential Land",
          description: "Learn the crucial title verification steps, RERA compliance check procedures, and zoning laws to ensure your property purchase is 100% secure.",
          content: "Purchasing plot land requires careful due diligence. Key verification steps include examining 30-year Encumbrance Certificates (EC), verifying 7/12 land records and mutation entries, checking RERA registration numbers, ensuring town and country planning (TNCP/BDA/PMDA) approvals, and ensuring there are no pending litigation or conversion hurdles.",
          category: "Legal Guide",
          image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
          readTime: "7 min read",
          isPublished: true,
          isFeatured: false,
          priority: 2
        },
        {
          title: "The Rise of Eco-Friendly Gated Plot Communities Across India's IT Hubs",
          description: "Modern homeowners are shifting towards customizable villa plots within solar-powered, green luxury townships offering resort-like amenities.",
          content: "Post-pandemic buyer psychology has driven strong demand for sustainable, self-sufficient communities. Leading developers are integrating rainwater harvesting, solar microgrids, organic farming clusters, and private clubhouses into gated layout townships outside bustling urban centers.",
          category: "Lifestyle & Design",
          image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
          readTime: "4 min read",
          isPublished: true,
          isFeatured: false,
          priority: 3
        }
      ]);
      console.log('🌱 Seeded default News & Property Updates articles');
    }
  } catch (err) {
    console.error('Error seeding news articles:', err);
  }
};

// Run seed on startup
seedDefaultArticles();

/**
 * @desc    Get Published News Articles (Public)
 * @route   GET /api/news
 * @access  Public
 */
export const getPublicNews = async (req, res) => {
  try {
    const { category, limit = 10, page = 1, search } = req.query;
    const filter = { isPublished: true };

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const skip = (parsedPage - 1) * parsedLimit;

    const [articles, total] = await Promise.all([
      NewsArticle.find(filter)
        .sort({ priority: -1, publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      NewsArticle.countDocuments(filter)
    ]);

    res.json({
      success: true,
      articles,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('getPublicNews error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching news articles' });
  }
};

/**
 * @desc    Get Single Article by ID or Slug
 * @route   GET /api/news/:idOrSlug
 * @access  Public
 */
export const getNewsDetails = async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    let article;

    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      article = await NewsArticle.findById(idOrSlug);
    } else {
      article = await NewsArticle.findOne({ slug: idOrSlug });
    }

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    // Increment views asynchronously
    article.views = (article.views || 0) + 1;
    await article.save();

    res.json({ success: true, article });
  } catch (error) {
    console.error('getNewsDetails error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching article details' });
  }
};

/**
 * @desc    Get All News Articles (Admin)
 * @route   GET /api/news/admin/all
 * @access  Admin
 */
export const getAllNewsAdmin = async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (status === 'published') filter.isPublished = true;
    if (status === 'draft') filter.isPublished = false;

    const parsedLimit = parseInt(limit);
    const parsedPage = parseInt(page);
    const skip = (parsedPage - 1) * parsedLimit;

    const [articles, total, categoriesCount] = await Promise.all([
      NewsArticle.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      NewsArticle.countDocuments(filter),
      NewsArticle.distinct('category')
    ]);

    res.json({
      success: true,
      articles,
      categories: categoriesCount,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error('getAllNewsAdmin error:', error);
    res.status(500).json({ success: false, message: 'Error fetching articles' });
  }
};

/**
 * @desc    Create News Article (Admin)
 * @route   POST /api/news
 * @access  Admin
 */
export const createNewsArticle = async (req, res) => {
  try {
    const { title, description, content, category, readTime, isPublished, isFeatured, priority, image: imageUrl } = req.body;

    let image = imageUrl;
    if (req.file) {
      const uploadRes = await uploadToCloudinary(req.file.path, 'news');
      image = uploadRes.secure_url || uploadRes.url;
    }

    if (!image) {
      return res.status(400).json({ success: false, message: 'Cover image is required' });
    }

    const newArticle = await NewsArticle.create({
      title,
      description,
      content,
      category: category || 'Market Insights',
      readTime: readTime || '5 min read',
      isPublished: isPublished !== undefined ? isPublished : true,
      isFeatured: isFeatured !== undefined ? isFeatured : false,
      priority: priority ? parseInt(priority) : 0,
      image
    });

    res.status(201).json({ success: true, message: 'Article created successfully', article: newArticle });
  } catch (error) {
    console.error('createNewsArticle error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create article' });
  }
};

/**
 * @desc    Update News Article (Admin)
 * @route   PUT /api/news/:id
 * @access  Admin
 */
export const updateNewsArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await NewsArticle.findById(id);

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    const { title, description, content, category, readTime, isPublished, isFeatured, priority, image: imageUrl } = req.body;

    if (title) article.title = title;
    if (description) article.description = description;
    if (content !== undefined) article.content = content;
    if (category) article.category = category;
    if (readTime) article.readTime = readTime;
    if (isPublished !== undefined) article.isPublished = isPublished;
    if (isFeatured !== undefined) article.isFeatured = isFeatured;
    if (priority !== undefined) article.priority = parseInt(priority);

    if (req.file) {
      const uploadRes = await uploadToCloudinary(req.file.path, 'news');
      article.image = uploadRes.secure_url || uploadRes.url;
    } else if (imageUrl) {
      article.image = imageUrl;
    }

    await article.save();
    res.json({ success: true, message: 'Article updated successfully', article });
  } catch (error) {
    console.error('updateNewsArticle error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update article' });
  }
};

/**
 * @desc    Toggle Article Publish Status
 * @route   PATCH /api/news/:id/toggle-publish
 * @access  Admin
 */
export const toggleNewsPublish = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await NewsArticle.findById(id);

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    article.isPublished = !article.isPublished;
    await article.save();

    res.json({
      success: true,
      message: `Article ${article.isPublished ? 'published' : 'moved to drafts'}`,
      article
    });
  } catch (error) {
    console.error('toggleNewsPublish error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to toggle publish status' });
  }
};

/**
 * @desc    Delete News Article
 * @route   DELETE /api/news/:id
 * @access  Admin
 */
export const deleteNewsArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const article = await NewsArticle.findByIdAndDelete(id);

    if (!article) {
      return res.status(404).json({ success: false, message: 'Article not found' });
    }

    res.json({ success: true, message: 'Article deleted successfully' });
  } catch (error) {
    console.error('deleteNewsArticle error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete article' });
  }
};
