import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
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
  };
}

interface ChatbotProps {
  onClose?: () => void;
  defaultMinimized?: boolean;
  className?: string;
}

export function Chatbot({ onClose, defaultMinimized = false, className = '' }: ChatbotProps) {
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

  useEffect(() => {
    // Create a new session when component mounts
    createNewSession();
    // Fetch capabilities
    fetchCapabilities();
    
    // Add welcome message
    setMessages([{
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de IA de UrbanFlow, potenciado por Ollama (Llama 3). Puedo ayudarte con:\n\n• Consultar datos de sensores en tiempo real e históricos\n• Analizar la salud y el rendimiento del sistema\n• Identificar tendencias y anomalías\n• Generar reportes\n• Insights de mantenimiento predictivo\n\n¿En qué puedo ayudarte?',
      timestamp: new Date()
    }]);
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
        ? { question: input, session_id: sessionId }
        : { question: input, include_ml_analysis: true };

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
            data: result.data.data
          }
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Lo siento, encontré un error: ${result.data?.error || result.error || 'Error desconocido'}`,
        timestamp: new Date()
      };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Lo siento, no pude procesar tu solicitud. Por favor asegúrate de que el servicio de analytics y el servidor de Ollama estén ejecutándose. Error: ${error}`,
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

  const renderMessageContent = (message: Message) => {
    // If message has data table, render it
    if (message.metadata?.data && Array.isArray(message.metadata.data) && message.metadata.data.length > 0) {
      const data = message.metadata.data;
      const columns = Object.keys(data[0]);
      
      return (
        <div className="space-y-3 max-w-full overflow-hidden">
          <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
          
          <div className="rounded-lg border bg-slate-50 dark:bg-slate-900 p-3 mt-3 max-w-full overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {message.metadata.row_count} filas
              </span>
              {message.metadata.query_type && (
                <Badge variant="outline" className="text-xs">
                  {message.metadata.query_type}
                </Badge>
              )}
            </div>
            
            <ScrollArea className="h-[200px] w-full max-w-full">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
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
                          <TableCell key={col} className="text-xs whitespace-nowrap max-w-[150px] truncate">
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
            </ScrollArea>
            
            {message.metadata.sql_query && (
              <details className="mt-2">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
                  Ver Consulta SQL
                </summary>
                <pre className="text-xs bg-slate-100 dark:bg-slate-950 p-2 rounded mt-2 overflow-x-auto">
                  <code>{message.metadata.sql_query}</code>
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="prose prose-sm dark:prose-invert max-w-none break-words overflow-hidden">
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
    );
  };

  const suggestedQuestions = [
    "¿Cuántas cabinas están en estado de alerta?",
    "Muéstrame las mediciones recientes del sensor 1",
    "¿Cuál es el valor promedio de RMS hoy?",
    "Genera un reporte de salud del sistema"
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsMinimized(false)}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={`fixed bottom-4 right-4 w-[400px] h-[600px] shadow-2xl z-50 flex flex-col overflow-hidden ${className}`}>
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

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
          <div className="space-y-4">
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
          </div>

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
        </ScrollArea>

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


