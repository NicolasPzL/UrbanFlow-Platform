"""
Context manager for maintaining conversational state in the chatbot
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from collections import deque

class Message:
    """Represents a single message in the conversation"""
    def __init__(self, role: str, content: str, metadata: Optional[Dict[str, Any]] = None):
        self.role = role  # 'user' or 'assistant'
        self.content = content
        self.timestamp = datetime.utcnow()
        self.metadata = metadata or {}
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata
        }

class ConversationContext:
    """Manages conversation context and history"""
    
    def __init__(self, max_messages: int = 10):
        self.max_messages = max_messages
        self.messages: deque[Message] = deque(maxlen=max_messages)
        self.session_id: Optional[str] = None
        self.created_at = datetime.utcnow()
        self.last_updated = datetime.utcnow()
        self.metadata: Dict[str, Any] = {}
    
    def add_user_message(self, content: str, metadata: Optional[Dict[str, Any]] = None):
        """Add a user message to the context"""
        message = Message("user", content, metadata)
        self.messages.append(message)
        self.last_updated = datetime.utcnow()
    
    def add_assistant_message(self, content: str, metadata: Optional[Dict[str, Any]] = None):
        """Add an assistant message to the context"""
        message = Message("assistant", content, metadata)
        self.messages.append(message)
        self.last_updated = datetime.utcnow()
    
    def get_recent_messages(self, count: Optional[int] = None) -> List[Message]:
        """Get the most recent messages"""
        if count is None:
            return list(self.messages)
        return list(self.messages)[-count:]
    
    def get_messages_for_llm(self) -> List[Dict[str, str]]:
        """
        Formatea mensajes para el LLM (formato estándar role/content usado con Ollama)
        Devuelve una lista de diccionarios con llaves 'role' y 'content'
        """
        return [
            {"role": msg.role, "content": msg.content}
            for msg in self.messages
        ]
    
    def get_context_summary(self) -> str:
        """
        Generate a summary of the conversation context.
        Useful for providing context to SQL queries or analysis.
        """
        if not self.messages:
            return "No previous conversation context."
        
        summary_lines = [f"Conversation started at: {self.created_at.isoformat()}"]
        summary_lines.append(f"Total messages: {len(self.messages)}")
        
        # Extract key topics or entities mentioned
        user_messages = [msg for msg in self.messages if msg.role == "user"]
        if user_messages:
            recent_user_queries = [msg.content for msg in user_messages[-3:]]
            summary_lines.append("Recent user queries:")
            for query in recent_user_queries:
                summary_lines.append(f"  - {query[:100]}...")
        
        return "\n".join(summary_lines)
    
    def clear(self):
        """Clear all messages from context"""
        self.messages.clear()
        self.last_updated = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert context to dictionary for serialization"""
        return {
            "session_id": self.session_id,
            "created_at": self.created_at.isoformat(),
            "last_updated": self.last_updated.isoformat(),
            "message_count": len(self.messages),
            "messages": [msg.to_dict() for msg in self.messages],
            "metadata": self.metadata
        }

class ContextManager:
    """
    Manages multiple conversation contexts (sessions).
    In a production environment, this would be backed by Redis or a database.
    """
    
    def __init__(self):
        self.contexts: Dict[str, ConversationContext] = {}
    
    def create_context(self, session_id: str, max_messages: int = 10) -> ConversationContext:
        """Create a new conversation context"""
        context = ConversationContext(max_messages=max_messages)
        context.session_id = session_id
        self.contexts[session_id] = context
        return context
    
    def get_context(self, session_id: str) -> Optional[ConversationContext]:
        """Get an existing context by session ID"""
        return self.contexts.get(session_id)
    
    def get_or_create_context(self, session_id: str, max_messages: int = 10) -> ConversationContext:
        """Get existing context or create a new one"""
        context = self.get_context(session_id)
        if context is None:
            context = self.create_context(session_id, max_messages)
        return context
    
    def delete_context(self, session_id: str) -> bool:
        """Delete a context by session ID"""
        if session_id in self.contexts:
            del self.contexts[session_id]
            return True
        return False
    
    def clear_old_contexts(self, max_age_hours: int = 24):
        """
        Remove contexts that haven't been updated in max_age_hours.
        Useful for memory management.
        """
        now = datetime.utcnow()
        old_sessions = []
        
        for session_id, context in self.contexts.items():
            age_hours = (now - context.last_updated).total_seconds() / 3600
            if age_hours > max_age_hours:
                old_sessions.append(session_id)
        
        for session_id in old_sessions:
            self.delete_context(session_id)
        
        return len(old_sessions)
    
    def get_all_sessions(self) -> List[str]:
        """Get list of all active session IDs"""
        return list(self.contexts.keys())
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about active contexts"""
        return {
            "total_sessions": len(self.contexts),
            "total_messages": sum(len(ctx.messages) for ctx in self.contexts.values()),
            "oldest_session": min(
                (ctx.created_at for ctx in self.contexts.values()),
                default=None
            ),
            "newest_session": max(
                (ctx.created_at for ctx in self.contexts.values()),
                default=None
            )
        }

# Global context manager instance
# In production, consider using dependency injection or a proper state management solution
_context_manager = ContextManager()

def get_context_manager() -> ContextManager:
    """Get the global context manager instance"""
    return _context_manager


