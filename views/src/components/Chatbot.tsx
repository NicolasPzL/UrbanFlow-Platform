import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  Bot, 
  User, 
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    query_type?: string;
    sql_query?: string;
    row_count?: number;
    data?: any[];
    intent_id?: string;
    intent_confidence?: number;
  };
}

interface ChatbotProps {
  onClose?: () => void;
  defaultMinimized?: boolean;
  className?: string;
  userRole?: string; // admin, analista, operador, cliente
}

export function Chatbot({ onClose, defaultMinimized = false, className = '', userRole = 'cliente' }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [capabilities, setCapabilities] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Usar rutas relativas para que pasen por el proxy del backend Node
  const ANALYTICS_API = '/api';

  const normalizedRole = (userRole ?? '').toLowerCase();
  const isCitizen = normalizedRole === 'cliente' || normalizedRole === 'ciudadano';
  const isStaff = ['admin', 'operador', 'analista'].includes(normalizedRole);

  const welcomeMessage = useMemo(() => {
    if (isCitizen) {
      return (
        '¡Hola! Soy tu asistente de UrbanFlow para la ciudadanía. ' +
        'Puedo informarte sobre el estado general del servicio, recomendaciones y roles oficiales, ' +
        'protegiendo siempre los datos sensibles conforme a las normas ISO aplicables. ¿En qué puedo ayudarte hoy?'
      );
    }
    if (isStaff) {
      return (
        'Hola, estoy listo para ayudarte con consultas operativas, analíticas y reportes del sistema. ' +
        'Recuerda que cumplimos las políticas ISO de seguridad: evita solicitar datos personales o auditorías.'
      );
    }
    return (
      '¡Hola! Puedo orientarte sobre UrbanFlow y su operación. Si necesitas detalles técnicos, inicia sesión con un rol autorizado.'
    );
  }, [isCitizen, isStaff]);

  const suggestedQuestions = useMemo(() => {
    if (isCitizen) {
      return [
        "¿Cuál es el estado del servicio hoy?",
        "¿Cuántas cabinas están disponibles para pasajeros?",
        "¿Qué roles existen en UrbanFlow?",
        "¿Qué recomendaciones de seguridad debo seguir?"
      ];
    }
    return [
      "¿Cuántas cabinas están operativas?",
      "Muéstrame las últimas 10 mediciones del sensor 1",
      "¿Cuál es el valor promedio de RMS de las últimas 24 horas?",
      "¿Cuántas cabinas están en estado de alerta?",
      "Genera un reporte de salud del sistema",
      "¿Qué hace UrbanFlow?"
    ];
  }, [isCitizen]);

  useEffect(() => {
    setSessionId(null);
    createNewSession();
    fetchCapabilities();

    setMessages([{
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date()
    }]);
  }, [welcomeMessage]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    const scrollToBottom = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    };
    // Small delay to ensure DOM is updated
    setTimeout(scrollToBottom, 100);
  }, [messages]);

  const createNewSession = async () => {
    try {
      const response = await fetch(`${ANALYTICS_API}/chatbot/session/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const result = await response.json();
      if (result.ok) {
        setSessionId(result.data.session_id);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const fetchCapabilities = async () => {
    try {
      const response = await fetch(`${ANALYTICS_API}/chatbot/capabilities`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.ok) {
        setCapabilities(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch capabilities:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const endpoint = sessionId 
        ? `${ANALYTICS_API}/chatbot/conversation`
        : `${ANALYTICS_API}/chatbot/query`;

      const body = sessionId
        ? { question: input, session_id: sessionId, user_role: userRole }
        : { question: input, include_ml_analysis: true, user_role: userRole };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (result.ok && result.data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: result.data.response,
          timestamp: new Date(),
          metadata: {
            query_type: result.data.query_type,
            sql_query: result.data.sql_query,
            row_count: result.data.row_count,
            data: result.data.data,
            intent_id: result.data.intent_id,
            intent_confidence: result.data.intent_confidence
          }
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Si hay error en la respuesta, usar el mensaje de error del servidor o mensaje genérico
        const errorResponse = result.data?.response || result.data?.error || result.error;
        const errorMessage: Message = {
          role: 'assistant',
          content: errorResponse || "Lo siento, en este momento no tengo esa información disponible. Por favor, contacta con soporte técnico para que puedan ayudarte con tu consulta o actualizarme con esa información.",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error processing request:', error);  // Log para debugging
      const errorMessage: Message = {
        role: 'assistant',
        content: "Lo siento, en este momento no tengo esa información disponible. Por favor, contacta con soporte técnico para que puedan ayudarte con tu consulta o actualizarme con esa información.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetConversation = () => {
    setMessages([{
      role: 'assistant',
      content: 'Conversación reiniciada. ¿Cómo puedo ayudarte hoy?',
      timestamp: new Date()
    }]);
    createNewSession();
  };

  const parseMarkdown = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];
    let currentParagraph: string[] = [];
    let listItems: string[] = [];
    let inList = false;
    
    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim();
        if (paragraphText) {
          elements.push(
            <p key={`p-${elements.length}`} className="mb-3 leading-relaxed">
              {parseInlineMarkdown(paragraphText)}
            </p>
          );
        }
        currentParagraph = [];
      }
    };
    
    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-inside mb-3 space-y-1 ml-4">
            {listItems.map((item, idx) => (
              <li key={idx} className="text-sm leading-relaxed">
                {parseInlineMarkdown(item.trim())}
              </li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };
    
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      
      // Title detection (line with only bold text, no other content)
      const boldOnlyMatch = trimmed.match(/^\*\*([^*]+)\*\*$/);
      if (boldOnlyMatch && trimmed.length < 100) {
        if (inList) {
          flushList();
        }
        flushParagraph();
        elements.push(
          <h3 key={`h3-${elements.length}`} className="font-bold text-base mb-2 mt-4 text-slate-900 dark:text-slate-100 first:mt-0">
            {boldOnlyMatch[1]}
          </h3>
        );
        return;
      }
      
      // List item detection (starts with * or -)
      if (trimmed.match(/^[\*\-]\s+/)) {
        if (!inList) {
          flushParagraph();
          inList = true;
        }
        listItems.push(trimmed.replace(/^[\*\-]\s+/, ''));
      } else {
        // Not a list item
        if (inList) {
          flushList();
        }
        
        if (trimmed === '') {
          // Empty line - flush current paragraph
          flushParagraph();
        } else {
          currentParagraph.push(trimmed);
        }
      }
    });
    
    flushParagraph();
    flushList();
    
    return elements.length > 0 ? elements : [<p key="empty" className="mb-3">{parseInlineMarkdown(text)}</p>];
  };
  
  const parseInlineMarkdown = (text: string): (string | React.ReactElement)[] => {
    const parts: (string | React.ReactElement)[] = [];
    let currentIndex = 0;
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let match;
    let lastIndex = 0;
    
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add bold text
      parts.push(
        <strong key={`bold-${currentIndex}`} className="font-semibold text-slate-900 dark:text-slate-100">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
      currentIndex++;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : [text];
  };

  const renderMessageContent = (message: Message) => {
    const hasIntentBadge = Boolean(message.metadata?.intent_id);
    const hasTypeBadge = Boolean(message.metadata?.query_type);
    const badges = (hasIntentBadge || hasTypeBadge) ? (
      <div className="flex items-center gap-2 mb-2">
        {hasIntentBadge && (
          <Badge variant="secondary" className="text-xs uppercase tracking-wide">
            Respuesta guiada
          </Badge>
        )}
        {hasTypeBadge && (
          <Badge variant="outline" className="text-xs">
            {message.metadata?.query_type}
          </Badge>
        )}
      </div>
    ) : null;

    // If message has data table, render it
    if (message.metadata?.data && Array.isArray(message.metadata.data) && message.metadata.data.length > 0) {
      const data = message.metadata.data;
      const columns = Object.keys(data[0]);
      
      return (
        <div className="space-y-3 max-w-full overflow-hidden">
          <div className="max-w-none break-words">
            {badges}
            {parseMarkdown(message.content)}
          </div>
          
          <div className="rounded-lg border bg-slate-50 dark:bg-slate-900 p-3 mt-3 max-w-full overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {message.metadata.row_count} filas
              </span>
              {(hasIntentBadge || hasTypeBadge) && (
                <div className="flex items-center gap-2">
                  {hasIntentBadge && (
                    <Badge variant="secondary" className="text-xs uppercase tracking-wide">
                      Respuesta guiada
                    </Badge>
                  )}
                  {hasTypeBadge && (
                    <Badge variant="outline" className="text-xs">
                      {message.metadata?.query_type}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            
            <div className="h-[200px] w-full max-w-full overflow-hidden">
              <div className="overflow-x-auto overflow-y-auto h-full w-full">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow>
                      {columns.map(col => (
                        <TableHead key={col} className="text-xs font-semibold whitespace-nowrap">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx}>
                        {columns.map(col => (
                          <TableCell key={col} className="text-xs whitespace-nowrap max-w-[120px] truncate overflow-hidden">
                            {typeof row[col] === 'object' 
                              ? JSON.stringify(row[col])
                              : String(row[col] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-none break-words overflow-hidden text-sm">
        {badges}
        {parseMarkdown(message.content)}
      </div>
    );
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-[90] ${className}`}>
        <Button
          onClick={() => setIsMinimized(false)}
          size="lg"
          className="rounded-full w-14 h-14 shadow-2xl bg-blue-600 hover:bg-blue-700"
        >
          <MessageCircle className="h-6 w-6 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={`fixed bottom-4 right-4 w-[400px] h-[600px] max-w-[400px] max-h-[600px] shadow-2xl z-[90] flex flex-col overflow-hidden ${className}`} style={{ width: '400px', height: '600px', zIndex: 90 }}>
      <CardHeader className="pb-3 flex-shrink-0 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Asistente IA UrbanFlow</CardTitle>
              <p className="text-xs text-slate-500">
                {capabilities
                  ? `${(capabilities.llm_provider || 'ollama').toUpperCase()} · ${capabilities.model_name}`
                  : 'Cargando información del LLM...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={resetConversation}
              className="h-8 w-8"
              title="Reiniciar conversación"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8"
              title="Minimizar"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col p-0 overflow-hidden" style={{ height: '527px' }}>
        <style>{`
          .chat-scrollbar::-webkit-scrollbar {
            width: 8px !important;
            display: block !important;
          }
          .chat-scrollbar::-webkit-scrollbar-track {
            background: rgb(241 245 249);
            border-radius: 4px;
          }
          .chat-scrollbar::-webkit-scrollbar-thumb {
            background: rgb(148 163 184);
            border-radius: 4px;
          }
          .chat-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgb(100 116 139);
          }
        `}</style>
        <div 
          className="w-full overflow-y-scroll overflow-x-hidden px-4 py-3 chat-scrollbar"
          style={{ 
            height: '100%', 
            maxHeight: '527px',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgb(148 163 184) rgb(241 245 249)'
          }}
          ref={scrollRef}
        >
          <div className="space-y-4 max-w-full pr-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                
                <div className={`flex-1 min-w-0 ${message.role === 'user' ? 'max-w-[80%]' : 'max-w-[90%]'}`}>
                  <div
                    className={`rounded-lg p-3 overflow-hidden ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white ml-auto'
                        : 'bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    {renderMessageContent(message)}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>

                {message.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}

            {messages.length === 1 && (
              <div className="mt-6 space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Prueba preguntando:
                </p>
                {suggestedQuestions.map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="block w-full text-left text-xs p-2 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div className="p-3 flex-shrink-0">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Pregunta sobre tu sistema..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              size="icon"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Las respuestas de IA pueden no ser siempre precisas
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default Chatbot;


