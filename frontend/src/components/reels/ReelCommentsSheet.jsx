import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, CornerDownRight, Trash2 } from 'lucide-react';
import { reelService } from '../../services/reelService';
import toast from 'react-hot-toast';

export default function ReelCommentsSheet({ isOpen, onClose, reel, onCommentAdded, onCommentDeleted }) {
  const [comments, setComments] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null); // Comment object replying to
  const [submitting, setSubmitting] = useState(false);

  const currentUser = useMemo(() => {
    try {
      const u = localStorage.getItem('user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const loadComments = useCallback(async (cursor = null) => {
    if (!reel?._id) return;
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await reelService.getComments(reel._id, {
        limit: 20,
        ...(cursor && { cursor }),
      });
      if (cursor) {
        setComments((prev) => [...prev, ...res.comments]);
      } else {
        setComments(res.comments || []);
      }
      setNextCursor(res.nextCursor || null);
    } catch (e) {
      console.error('Failed to load comments', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [reel?._id]);

  useEffect(() => {
    if (isOpen && reel?._id) loadComments();
  }, [isOpen, reel?._id, loadComments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await reelService.comment(reel._id, trimmed, replyingTo?._id || null);
      setComments((prev) => [res.comment, ...prev]);
      setText('');
      setReplyingTo(null);
      onCommentAdded?.(reel._id);
    } catch (err) {
      console.error('Comment failed', err);
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await reelService.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      if (onCommentDeleted) onCommentDeleted(reel._id);
      else if (onCommentAdded) onCommentAdded(reel._id, -1);
      toast.success('Comment deleted');
    } catch (err) {
      console.error('Delete comment error', err);
      toast.error(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  const loadMore = () => {
    if (nextCursor && !loadingMore) loadComments(nextCursor);
  };

  if (!reel) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] flex flex-col z-[61] safe-area-bottom"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Comments</h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X size={22} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="p-6 text-center text-gray-500">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No comments yet. Be the first to comment!</div>
              ) : (
                <ul className="p-4 space-y-4">
                  {comments.map((c) => {
                    const isMyComment =
                      currentUser &&
                      (c.user?._id === currentUser._id || c.user === currentUser._id);
                    const isAdmin =
                      currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

                    return (
                      <li key={c._id} className="space-y-2">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-600/20 shrink-0 overflow-hidden flex items-center justify-center">
                            {c.user?.profileImage ? (
                              <img
                                src={c.user.profileImage}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-emerald-700 font-bold text-xs">
                                {(c.user?.name || 'U').charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-xs text-gray-900">
                                {c.user?.name || 'User'}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setReplyingTo(c)}
                                  className="text-[11px] font-bold text-emerald-600 hover:underline"
                                >
                                  Reply
                                </button>
                                {(isMyComment || isAdmin) && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteComment(c._id)}
                                    className="text-gray-400 hover:text-red-600 p-1"
                                    title="Delete comment"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-sm text-gray-700 break-words mt-0.5">{c.text}</p>

                            {/* Show parent comment preview if it's a nested reply */}
                            {c.parentComment && (
                              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-gray-500 bg-gray-50 p-1.5 rounded-lg">
                                <CornerDownRight size={12} className="text-emerald-600" />
                                <span className="truncate">Replying to comment</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {nextCursor && (
                <div className="p-4 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="text-sm font-medium text-emerald-600"
                  >
                    {loadingMore ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </div>

            {/* Replying banner indicator */}
            {replyingTo && (
              <div className="px-4 py-1.5 bg-emerald-50 border-t border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
                <span>
                  Replying to <span className="font-bold">{replyingTo.user?.name || 'User'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="text-emerald-600 font-bold text-[11px]"
                >
                  Cancel
                </button>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-gray-100 flex gap-2 items-center"
            >
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={replyingTo ? `Reply to ${replyingTo.user?.name || 'user'}...` : 'Add a comment...'}
                maxLength={300}
                className="flex-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <button
                type="submit"
                disabled={!text.trim() || submitting}
                className="p-2.5 rounded-full bg-emerald-600 text-white disabled:opacity-50 hover:bg-emerald-700"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
