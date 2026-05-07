"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Eraser, Pencil, Trash2, X, Lock, Unlock } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

export default function Whiteboard({ 
  isActive, 
  isAdmin, 
  meeting, 
  onClose,
  canStudentsDraw,
  onToggleStudentDraw
}: { 
  isActive: boolean;
  isAdmin: boolean;
  meeting: any;
  onClose: () => void;
  canStudentsDraw: boolean;
  onToggleStudentDraw?: (val: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ea580c');
  const [width, setWidth] = useState(3);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStroke = useRef<Point[]>([]);

  // Draw current strokes on canvas
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });

    if (currentStroke.current.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.moveTo(currentStroke.current[0].x, currentStroke.current[0].y);
      for (let i = 1; i < currentStroke.current.length; i++) {
        ctx.lineTo(currentStroke.current[i].x, currentStroke.current[i].y);
      }
      ctx.stroke();
    }
  };

  useEffect(() => {
    render();
  }, [strokes]);

  // Handle Incoming Messages
  useEffect(() => {
    if (!meeting) return;

    const handleMessage = (msg: any) => {
      if (msg.type === 'whiteboard-draw') {
        setStrokes(prev => [...prev, msg.stroke]);
      } else if (msg.type === 'whiteboard-clear') {
        setStrokes([]);
      } else if (msg.type === 'whiteboard-history-request' && isAdmin) {
        // Only Admin responds with history
        meeting.sendCustomMessage({
          type: 'whiteboard-history-response',
          strokes: strokes
        });
      } else if (msg.type === 'whiteboard-history-response' && !isAdmin) {
        setStrokes(msg.strokes);
      }
    };

    meeting.addListener('customMessage', handleMessage);
    
    // Request history when joining
    if (isActive) {
      meeting.sendCustomMessage({ type: 'whiteboard-history-request' });
    }

    return () => {
      meeting.removeListener('customMessage', handleMessage);
    };
  }, [meeting, isActive, isAdmin, strokes]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isAdmin && !canStudentsDraw) return;
    
    setIsDrawing(true);
    const pos = getPos(e);
    currentStroke.current = [pos];
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    currentStroke.current.push(pos);
    render();
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const newStroke: Stroke = {
      points: currentStroke.current,
      color: color,
      width: width
    };

    setStrokes(prev => [...prev, newStroke]);
    
    // Sync with others
    meeting.sendCustomMessage({
      type: 'whiteboard-draw',
      stroke: newStroke
    });

    currentStroke.current = [];
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const clearCanvas = () => {
    if (!isAdmin) return;
    setStrokes([]);
    meeting.sendCustomMessage({ type: 'whiteboard-clear' });
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-[60] bg-neutral-950 flex flex-col animate-in fade-in duration-300">
      {/* Header */}
      <div className="h-14 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h3 className="text-white font-bold text-sm">डिजिटल व्हाइटबोर्ड</h3>
          {isAdmin && (
             <button 
               onClick={() => onToggleStudentDraw?.(!canStudentsDraw)}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                 canStudentsDraw ? 'bg-green-600/20 text-green-400 border border-green-600/30' : 'bg-red-600/20 text-red-400 border border-red-600/30'
               }`}
             >
               {canStudentsDraw ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
               {canStudentsDraw ? 'Students Drawing Enabled' : 'Students View Only'}
             </button>
          )}
          {!isAdmin && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
              canStudentsDraw ? 'text-green-400' : 'text-orange-400'
            }`}>
              {canStudentsDraw ? 'आप लिख सकते हैं' : 'केवल देख सकते हैं (View Only)'}
            </div>
          )}
        </div>
        <button onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 relative bg-white overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-contain"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />

        {/* Floating Toolbar */}
        {(isAdmin || canStudentsDraw) && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-neutral-900/90 backdrop-blur border border-neutral-700 p-2 rounded-2xl shadow-2xl flex flex-col gap-3">
             <button 
               onClick={() => setColor('#ea580c')}
               className={`w-8 h-8 rounded-full bg-orange-600 border-2 transition-all ${color === '#ea580c' ? 'border-white scale-110' : 'border-transparent'}`}
             />
             <button 
               onClick={() => setColor('#2563eb')}
               className={`w-8 h-8 rounded-full bg-blue-600 border-2 transition-all ${color === '#2563eb' ? 'border-white scale-110' : 'border-transparent'}`}
             />
             <button 
               onClick={() => setColor('#000000')}
               className={`w-8 h-8 rounded-full bg-black border-2 transition-all ${color === '#000000' ? 'border-white scale-110' : 'border-transparent'}`}
             />
             <div className="w-full h-px bg-neutral-800" />
             <button 
               onClick={() => setWidth(3)}
               className={`p-2 rounded-xl transition-all ${width === 3 ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:bg-neutral-800'}`}
             >
               <Pencil className="w-4 h-4" />
             </button>
             <button 
               onClick={() => setWidth(10)}
               className={`p-2 rounded-xl transition-all ${width === 10 ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:bg-neutral-800'}`}
             >
               <Eraser className="w-5 h-5" />
             </button>
             {isAdmin && (
               <>
                 <div className="w-full h-px bg-neutral-800" />
                 <button 
                   onClick={clearCanvas}
                   className="p-2 rounded-xl text-neutral-400 hover:bg-red-600/20 hover:text-red-500 transition-all"
                 >
                   <Trash2 className="w-5 h-5" />
                 </button>
               </>
             )}
          </div>
        )}
      </div>
    </div>
  );
}
