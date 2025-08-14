import { useState, useEffect, useRef } from "react";
import { messageService, MessageData } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface ChatPanelProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatPanel({ user, isOpen, onClose }: ChatPanelProps) {
  const [chatWith, setChatWith] = useState("");
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }
    
    if (!user || !chatWith) {
      setMessages([]);
      return;
    }

    try {
      const unsubscribe = messageService.onMessagesChange(
        user.email,
        chatWith,
        (newMessages) => {
          setMessages(newMessages);
        }
      );
      unsubRef.current = unsubscribe;
    } catch (error) {
      console.error("Failed to setup message listener:", error);
    }

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [user, chatWith]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = messageText.trim();
    if (!text || !user || !chatWith) return;

    setLoading(true);
    try {
      await messageService.sendMessage(text, user.email, chatWith);
      setMessageText("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to send message",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="absolute bottom-0 right-0 w-full max-w-md h-96 bg-white rounded-t-2xl shadow-2xl">
        <CardHeader className="p-4 border-b bg-gray-50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                <i className="fas fa-user text-white text-sm"></i>
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  {chatWith || "Chat with Owner"}
                </p>
                <p className="text-xs text-gray-600">
                  <span className="w-2 h-2 bg-secondary rounded-full inline-block mr-1"></span>
                  Online
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <i className="fas fa-times text-gray-600"></i>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="mb-4 px-4 pt-4">
            <Input
              placeholder="Chat with (owner email)"
              value={chatWith}
              onChange={(e) => setChatWith(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="h-48 overflow-y-auto px-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <i className="fas fa-comments text-2xl mb-2"></i>
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs">Start a conversation</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === user.email ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg ${
                      message.sender === user.email
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.sender === user.email ? "text-blue-200" : "text-gray-500"
                      }`}
                    >
                      {message.createdAt?.toDate
                        ? message.createdAt.toDate().toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 text-sm"
                disabled={loading || !chatWith}
              />
              <Button
                onClick={sendMessage}
                disabled={loading || !messageText.trim() || !chatWith}
                size="icon"
                className="bg-primary hover:bg-primary/90"
              >
                <i className="fas fa-paper-plane"></i>
              </Button>
            </div>
          </div>
        </CardContent>
      </div>
    </div>
  );
}
