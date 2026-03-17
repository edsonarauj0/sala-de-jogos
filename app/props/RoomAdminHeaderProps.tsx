import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Check } from "lucide-react";
import Link from 'next/link';

interface RoomAdminHeaderProps {
  id: string | string[];
  roomName: string;
  isRevealed: boolean;
  copied: boolean;
  onCopy: () => void;
}

export function RoomAdminHeader({
  id,
  roomName,
  isRevealed,
  copied,
  onCopy,
}: RoomAdminHeaderProps) {
  return (
    <div className="border-b bg-background sticky top-0 z-30 px-4 lg:px-6 py-4">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">{roomName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {typeof id === 'string' ? id.slice(0, 8) : id?.[0]?.slice(0, 8)}
              </Badge>
              {isRevealed && (
                <Badge className="text-[10px] bg-green-600 text-white">Finalizado</Badge>
              )}
            </div>
          </div>
        </div>
        <Button
          onClick={onCopy}
          variant="outline"
          size="sm"
          className="hidden sm:flex"
        >
          {copied ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <Copy className="w-4 h-4 mr-2" />
          )}
          <span>{copied ? "Copiado" : "Copiar Link"}</span>
        </Button>
        <Button
          onClick={onCopy}
          size="icon"
          className="sm:hidden"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}