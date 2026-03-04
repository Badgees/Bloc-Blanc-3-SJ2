import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Edit, Trash2, Calendar, User, Send, X, Check } from 'lucide-react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const SERVER = 'http://localhost:5030';

// XSS protection: on sanitize le contenu avant de l'injecter dans le DOM via dangerouslySetInnerHTML.
const renderSafe = (content) => ({
    __html: DOMPurify.sanitize(marked.parse(content))
});

const ArticleDetail = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);

    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [commentError, setCommentError] = useState('');

    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        const fetchArticle = async () => {
            try {
                const { data } = await API.get(`/articles/${id}`);
                setArticle(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchArticle();
        fetchComments();
    }, [id]);

    const fetchComments = async () => {
        try {
            const { data } = await API.get(`/comments/${id}`);
            setComments(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleArticleDelete = async () => {
        if (window.confirm('Voulez-vous vraiment supprimer cet article ?')) {
            try {
                await API.delete(`/articles/${id}`);
                navigate('/');
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        setCommentError('');
        if (!newComment.trim()) {
            return setCommentError('Le commentaire ne peut pas être vide.');
        }
        try {
            const { data } = await API.post(`/comments/${id}`, { content: newComment });
            setComments(prev => [...prev, data]);
            setNewComment('');
        } catch (err) {
            setCommentError(err.response?.data?.message || 'Une erreur est survenue.');
        }
    };

    const handleCommentDelete = async (commentId) => {
        if (!window.confirm('Supprimer ce commentaire ?')) return;
        try {
            await API.delete(`/comments/${commentId}`);
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (err) {
            console.error(err);
        }
    };

    const startEdit = (comment) => {
        setEditingId(comment.id);
        setEditContent(comment.content);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditContent('');
    };

    const handleCommentEdit = async (commentId) => {
        if (!editContent.trim()) return;
        try {
            await API.put(`/comments/${commentId}`, { content: editContent });
            setComments(prev =>
                prev.map(c => c.id === commentId ? { ...c, content: editContent } : c)
            );
            cancelEdit();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) return <div>Chargement...</div>;
    if (!article) return <div>Article introuvable.</div>;

    const isOwner = user && user.id === article.user_id;

    return (
        <div style={{ maxWidth: '800px', margin: '40px auto' }}>
            <article>
                {article.image && (
                    <img
                        src={`${SERVER}${article.image}`}
                        alt={article.title}
                        style={{ width: '100%', height: '400px', objectFit: 'cover', borderRadius: '16px', marginBottom: '30px' }}
                    />
                )}

                <h1 style={{ fontSize: '2.5rem', marginBottom: '20px' }}>{article.title}</h1>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '20px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {article.avatar ? (
                            <img src={`${SERVER}${article.avatar}`} alt={article.username} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                        ) : <User />}
                        <div>
                            <Link to={`/profile/${article.user_id}`} style={{ fontWeight: 'bold' }}>{article.username}</Link>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Calendar size={14} /> {new Date(article.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    {isOwner && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <Link to={`/edit/${id}`} className="btn glass" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Edit size={16} /> Modifier
                            </Link>
                            <button onClick={handleArticleDelete} className="btn" style={{ padding: '8px 12px', background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Trash2 size={16} /> Supprimer
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ fontSize: '1.2rem', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                    {article.content}
                </div>
            </article>

            {/* ── Comments Section ── */}
            <section style={{ marginTop: '60px' }}>
                <h2 style={{ marginBottom: '30px', fontSize: '1.5rem' }}>
                    Commentaires ({comments.length})
                </h2>

                {/* Comment list */}
                {comments.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
                        Aucun commentaire pour l'instant. Soyez le premier !
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
                        {comments.map(comment => (
                            <div key={comment.id} className="glass" style={{ padding: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {comment.avatar ? (
                                            <img src={`${SERVER}${comment.avatar}`} alt={comment.username} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                        ) : <User size={20} />}
                                        <div>
                                            <Link to={`/profile/${comment.user_id}`} style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                                                {comment.username}
                                            </Link>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                {new Date(comment.created_at).toLocaleDateString('fr-FR', {
                                                    day: 'numeric', month: 'long', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Edit/Delete only visible to the comment's author */}
                                    {user && user.id === comment.user_id && (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => startEdit(comment)}
                                                className="btn glass"
                                                style={{ padding: '4px 10px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                <Edit size={14} /> Modifier
                                            </button>
                                            <button
                                                onClick={() => handleCommentDelete(comment.id)}
                                                className="btn"
                                                style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                <Trash2 size={14} /> Supprimer
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {editingId === comment.id ? (
                                    <div>
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            rows={4}
                                            maxLength={5000}
                                            style={{ width: '100%', resize: 'vertical', marginBottom: '10px' }}
                                        />
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button onClick={cancelEdit} className="btn glass" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <X size={14} /> Annuler
                                            </button>
                                            <button onClick={() => handleCommentEdit(comment.id)} className="btn btn-primary" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Check size={14} /> Enregistrer
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    // Content rendered via marked (Markdown → HTML) then sanitized
                                    // by DOMPurify before injection — prevents XSS attacks
                                    <div
                                        dangerouslySetInnerHTML={renderSafe(comment.content)}
                                        style={{ lineHeight: '1.6', fontSize: '0.95rem' }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Post form — only shown to logged-in users */}
                {user ? (
                    <div className="glass" style={{ padding: '24px' }}>
                        <h3 style={{ marginBottom: '8px', fontSize: '1.1rem' }}>Laisser un commentaire</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                            Markdown, HTML et texte brut sont supportés.
                        </p>
                        {commentError && (
                            <div style={{ color: '#ef4444', marginBottom: '12px', fontSize: '0.9rem' }}>
                                {commentError}
                            </div>
                        )}
                        <form onSubmit={handleCommentSubmit}>
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Écrivez votre commentaire... (Markdown supporté)"
                                rows={4}
                                maxLength={5000}
                                style={{ width: '100%', resize: 'vertical', marginBottom: '12px' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {newComment.length} / 5000
                                </span>
                                <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Send size={16} /> Publier
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="glass" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <Link to="/login" style={{ color: 'var(--primary)' }}>Connectez-vous</Link> pour laisser un commentaire.
                    </div>
                )}
            </section>
        </div>
    );
};

export default ArticleDetail;
