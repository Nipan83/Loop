import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import './ReplyItem.css'

export default function ReplyItem({ reply, postId, onReplyAdded, depth = 0 }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [upvotes, setUpvotes] = useState(reply.upvotes)
  const [hasUpvoted, setHasUpvoted] = useState(reply.hasUpvoted)

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const handleUpvote = async () => {
    if (!user) {
      navigate('/login')
      return
    }

    try {
      const response = await api.post(`/replies/${reply.id}/upvote`)
      setUpvotes(response.data.upvotes)
      setHasUpvoted(response.data.hasUpvoted)
    } catch (error) {
      console.error('Failed to upvote:', error)
    }
  }

  const handleReply = async (e) => {
    e.preventDefault()
    
    if (!user) {
      navigate('/login')
      return
    }

    if (!replyContent.trim()) return

    setSubmitting(true)
    try {
      const response = await api.post('/replies', {
        content: replyContent,
        post_id: postId,
        parent_reply_id: reply.id
      })
      
      if (onReplyAdded) {
        onReplyAdded(response.data, reply.id)
      }
      
      setReplyContent('')
      setShowReplyForm(false)
    } catch (error) {
      console.error('Failed to reply:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const maxDepth = 3
  const canNest = depth < maxDepth

  return (
    <div className={`reply-item ${depth > 0 ? 'nested' : ''}`}>
      <div className="reply-content-wrapper">
        <div className="reply-header">
          <span className="reply-author">@{reply.username}</span>
          <span className="reply-time">{formatDate(reply.created_at)}</span>
        </div>
        
        <p className="reply-content">{reply.content}</p>
        
        <div className="reply-actions">
          <button 
            className={`reply-action ${hasUpvoted ? 'active' : ''}`}
            onClick={handleUpvote}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={hasUpvoted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
            <span>{upvotes}</span>
          </button>
          
          {canNest && (
            <button 
              className="reply-action"
              onClick={() => user ? setShowReplyForm(!showReplyForm) : navigate('/login')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>Reply</span>
            </button>
          )}
        </div>

        {showReplyForm && (
          <form onSubmit={handleReply} className="nested-reply-form">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder={`Reply to @${reply.username}...`}
              rows={2}
            />
            <div className="nested-reply-actions">
              <button 
                type="button" 
                className="btn btn-ghost btn-sm"
                onClick={() => setShowReplyForm(false)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary btn-sm"
                disabled={submitting || !replyContent.trim()}
              >
                {submitting ? 'Posting...' : 'Reply'}
              </button>
            </div>
          </form>
        )}
      </div>

      {reply.children && reply.children.length > 0 && (
        <div className="reply-children">
          {reply.children.map(child => (
            <ReplyItem
              key={child.id}
              reply={child}
              postId={postId}
              onReplyAdded={onReplyAdded}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}