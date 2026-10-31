import PropertyDraft from '../models/PropertyDraft.js';

const MAX_DRAFT_BYTES = 1024 * 1024; // 1 MB, drafts only hold form data and image URLs
const validKey = (k) => typeof k === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(k);

export const listDrafts = async (req, res) => {
  try {
    const drafts = await PropertyDraft.find({ partnerId: req.user._id })
      .select('draftKey title step totalSteps updatedAt')
      .sort({ updatedAt: -1 });
    res.json({ success: true, drafts });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to load drafts' });
  }
};

export const getDraft = async (req, res) => {
  try {
    const draft = await PropertyDraft.findOne({ partnerId: req.user._id, draftKey: req.params.key });
    res.json({ success: true, draft: draft || null });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to load draft' });
  }
};

export const saveDraft = async (req, res) => {
  try {
    const { key } = req.params;
    if (!validKey(key)) return res.status(400).json({ success: false, message: 'Invalid draft key' });

    const { data, step, totalSteps, title, schemaVersion } = req.body || {};
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ success: false, message: 'Draft data is required' });
    }
    if (Buffer.byteLength(JSON.stringify(data)) > MAX_DRAFT_BYTES) {
      return res.status(413).json({ success: false, message: 'Draft is too large' });
    }

    const draft = await PropertyDraft.findOneAndUpdate(
      { partnerId: req.user._id, draftKey: key },
      {
        $set: {
          data,
          step: Math.max(1, Math.floor(Number(step)) || 1),
          totalSteps: Math.max(0, Math.floor(Number(totalSteps)) || 0),
          title: String(title || '').slice(0, 160),
          schemaVersion: Number(schemaVersion) || 1,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ success: true, updatedAt: draft.updatedAt });
  } catch (e) {
    console.error('Save draft error:', e);
    res.status(500).json({ success: false, message: 'Failed to save draft' });
  }
};

export const deleteDraft = async (req, res) => {
  try {
    await PropertyDraft.deleteOne({ partnerId: req.user._id, draftKey: req.params.key });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to delete draft' });
  }
};
