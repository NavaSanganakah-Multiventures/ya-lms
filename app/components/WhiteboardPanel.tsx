'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Pencil, Eraser, Trash2, Minus, Plus, Circle, Square, Minus as LineIcon, Download, Users, Lock, Unlock, ZoomIn, ZoomOut, Move } from 'lucide-react';

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────
interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: 'pen' | 'eraser' | 'pan';
  userId: string;
  userName: string;
  id: string;
}

interface StudentPermission {
  userId: string;
  userName: string;
  canWrite: boolean;
  isOnline: boolean;
}

interface WhiteboardPanelProps {
  sessionId: string;
  isAdmin: boolean;
  userId: string;
  userName: string;
  canWrite: boolean; // set by parent based on received permission signal
  onClose: () => void;
  meeting?: any; // The RTKMeeting client instance to share the stream
}

// ─────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────
const COLORS = ['#FFFFFF', '#EA580C', '#EF4444', '#22C55E', '#3B82F6', '#A855F7', '#EAB308', '#EC4899', '#000000'];
const COLOR_NAMES: Record<string, string> = {
  '#FFFFFF': 'White',
  '#EA580C': 'Orange',
  '#EF4444': 'Red',
  '#22C55E': 'Green',
  '#3B82F6': 'Blue',
  '#A855F7': 'Purple',
  '#EAB308': 'Yellow',
  '#EC4899': 'Pink',
  '#000000': 'Black'
};
const POLL_INTERVAL = 500; // Reduced to 0.5 seconds for faster syncing

// ─────────────────────────────────────────────
//  WhiteboardPanel Component
// ─────────────────────────────────────────────
export default function WhiteboardPanel({
  sessionId,
  isAdmin,
  userId,
  userName,
  canWrite: initialCanWrite,
  onClose,
  meeting,
}: WhiteboardPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null); // live drawing preview layer
  const isDrawing = useRef(false);
  const currentStroke = useRef<{ x: number; y: number }[]>([]);
  const lastPoll = useRef<string>('1970-01-01T00:00:00.000Z');
  const allStrokes = useRef<Stroke[]>([]);

  const [tool, setTool] = useState<'pen' | 'eraser' | 'pan'>('pen');
  const [color, setColor] = useState('#FFFFFF');
  const [brushSize, setBrushSize] = useState(3);
  const [canWrite, setCanWrite] = useState(isAdmin || initialCanWrite);
  const [students, setStudents] = useState<StudentPermission[]>([]);
  const [showStudents, setShowStudents] = useState(false);
  const [drawingUser, setDrawingUser] = useState<string | null>(null);

  // Pan and Zoom states
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const startPanPos = useRef({ x: 0, y: 0 });

  // ── Redraw all strokes on canvas ─────────────────
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset transform for background
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    ctx.fillStyle = '#1a1a2e'; // dark canvas background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply pan and zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);

    // Draw grid lines (adjusted for zoom/pan to look infinite, simplified by drawing a large grid)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1 / scale;
    const gridStart = -2000;
    const gridEnd = 4000;
    for (let x = gridStart; x < gridEnd; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, gridStart); ctx.lineTo(x, gridEnd); ctx.stroke();
    }
    for (let y = gridStart; y < gridEnd; y += 40) {
      ctx.beginPath(); ctx.moveTo(gridStart, y); ctx.lineTo(gridEnd, y); ctx.stroke();
    }

    // Draw each stroke
    for (const stroke of allStrokes.current) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#1a1a2e' : stroke.color;
      ctx.lineWidth = stroke.tool === 'eraser' ? stroke.width * 3 : stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [pan, scale]);

  // ── Share Canvas Stream ──────────────────────────
  useEffect(() => {
    if (!isAdmin || !meeting?.self) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture the stream from the canvas
    let stream: MediaStream | null = null;
    try {
      // Create a stream with 30fps
      stream = canvas.captureStream(30);
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // Start sharing the screen
        // Wrap the track into the expected property `video`
        meeting.self.shareScreen({ video: videoTrack }).catch(console.error);
      }
    } catch (e) {
      console.error('Failed to capture or share canvas stream:', e);
    }

    // Every time we draw on canvas, the stream auto-updates because captureStream binds it.
    // So we don't need to manually update frames.

    return () => {
      if (meeting?.self && meeting.self.screenShareEnabled) {
        meeting.self.disableScreenShare().catch(console.error);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isAdmin, meeting]);

  // ── Resize canvas to fit container ───────────────
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      if (!canvas || !overlay) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      overlay.width = rect.width * dpr;
      overlay.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
      const octx = overlay.getContext('2d');
      if (octx) octx.scale(dpr, dpr);
      redrawCanvas();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [redrawCanvas]);

  // ── Get canvas-relative coordinates ──────────────
  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    // Adjust for pan and scale to get true drawing coordinates
    return {
      x: (clientX - rect.left - pan.x) / scale,
      y: (clientY - rect.top - pan.y) / scale
    };
  };

  // ── Drawing & Panning handlers ──────────────────────────────
  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'pan') {
      setIsPanning(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      startPanPos.current = { x: clientX - pan.x, y: clientY - pan.y };
      return;
    }

    if (!canWrite) return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    isDrawing.current = true;
    const pos = getPos(e, overlay);
    currentStroke.current = [pos];
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (isPanning) {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setPan({
        x: clientX - startPanPos.current.x,
        y: clientY - startPanPos.current.y
      });
      return;
    }

    if (!isDrawing.current || !canWrite) return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    const ctx = overlay.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e, overlay);
    currentStroke.current.push(pos);

    // Live preview on overlay canvas
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // Reset to clear correctly
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    // Apply pan and zoom for preview
    ctx.translate(pan.x, pan.y);
    ctx.scale(scale, scale);

    ctx.beginPath();
    ctx.strokeStyle = tool === 'eraser' ? 'rgba(100,100,100,0.5)' : color;
    ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const points = currentStroke.current;
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  };

  const endDraw = async () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawing.current || !canWrite) return;
    isDrawing.current = false;

    // Clear overlay
    const overlay = overlayRef.current;
    if (overlay) {
      const ctx = overlay.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, overlay.width, overlay.height);
    }

    if (currentStroke.current.length < 2) return;

    const stroke: Stroke = {
      id: `${userId}-${Date.now()}`,
      points: currentStroke.current,
      color,
      width: brushSize,
      tool,
      userId,
      userName,
    };

    // Add to local canvas immediately
    allStrokes.current.push(stroke);
    redrawCanvas();

    // Sync to backend
    try {
      await fetch(`/api/live/signaling?sessionId=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'whiteboard_stroke', data: stroke }),
      });
    } catch (e) {
      console.error('Whiteboard sync error:', e);
    }

    currentStroke.current = [];
  };

  // ── Clear all (admin only) ────────────────────────
  const clearAll = async () => {
    if (!isAdmin) return;
    allStrokes.current = [];
    redrawCanvas();
    try {
      await fetch(`/api/live/signaling?sessionId=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'whiteboard_clear', data: { clearedBy: userId } }),
      });
    } catch (e) {
      console.error('Clear sync error:', e);
    }
  };

  // ── Toggle student write permission (admin only) ──
  const toggleStudentPermission = async (student: StudentPermission) => {
    if (!isAdmin) return;
    const newCanWrite = !student.canWrite;

    setStudents(prev => prev.map(s =>
      s.userId === student.userId ? { ...s, canWrite: newCanWrite } : s
    ));

    try {
      await fetch(`/api/live/signaling?sessionId=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'whiteboard_permission',
          data: { targetUserId: student.userId, canWrite: newCanWrite, grantedBy: userId },
        }),
      });
    } catch (e) {
      console.error('Permission sync error:', e);
    }
  };

  // ── Poll for new signals ──────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/live/signaling?sessionId=${sessionId}&lastPoll=${encodeURIComponent(lastPoll.current)}`);
        if (!res.ok) return;
        const { signals } = await res.json() as any;
        if (!signals || signals.length === 0) return;

        let needsRedraw = false;

        for (const signal of signals) {
          // Update lastPoll timestamp
          if (signal.created_at > lastPoll.current) {
            lastPoll.current = signal.created_at;
          }

          const data = typeof signal.data === 'string' ? JSON.parse(signal.data) : signal.data;

          if (signal.type === 'whiteboard_stroke') {
            // Don't re-apply own strokes
            if (data.userId !== userId) {
              allStrokes.current.push(data as Stroke);
              needsRedraw = true;
              setDrawingUser(data.userName);
              setTimeout(() => setDrawingUser(null), 2000);
            }
          } else if (signal.type === 'whiteboard_clear') {
            allStrokes.current = [];
            needsRedraw = true;
          } else if (signal.type === 'whiteboard_permission') {
            if (data.targetUserId === userId) {
              setCanWrite(data.canWrite);
            }
            // Admin tracks who's online / has permission (from student join signals)
          } else if (signal.type === 'whiteboard_join' && isAdmin) {
            setStudents(prev => {
              const exists = prev.find(s => s.userId === data.userId);
              if (exists) return prev.map(s => s.userId === data.userId ? { ...s, isOnline: true } : s);
              return [...prev, { userId: data.userId, userName: data.userName, canWrite: false, isOnline: true }];
            });
          }
        }

        if (needsRedraw) redrawCanvas();
      } catch (e) {
        // silent
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL);

    // Announce join
    if (!isAdmin) {
      fetch(`/api/live/signaling?sessionId=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'whiteboard_join', data: { userId, userName } }),
      }).catch(() => {});
    }

    return () => clearInterval(interval);
  }, [sessionId, userId, userName, isAdmin, redrawCanvas]);

  // ── Download whiteboard as PNG ────────────────────
  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // ─────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[200] flex">
      {/* ── Main Whiteboard Area ── */}
      <div className="flex-1 flex flex-col bg-[#0d0d1a]">

        {/* Top Toolbar */}
        <div className="h-14 bg-neutral-900/95 border-b border-white/5 flex items-center gap-3 px-4 backdrop-blur-xl shrink-0">
          {/* Left — Tools (only if canWrite) */}
          <div className="flex items-center gap-1">
            {canWrite ? (
              <>
                <button
                  onClick={() => setTool('pen')}
                  aria-label="Pen"
                  title="Pen"
                  className={`p-2 rounded-lg transition-all ${tool === 'pen' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/30' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTool('eraser')}
                  aria-label="Eraser"
                  title="Eraser"
                  className={`p-2 rounded-lg transition-all ${tool === 'eraser' ? 'bg-neutral-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
                >
                  <Eraser className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTool('pan')}
                  aria-label="Move/Pan"
                  title="Move/Pan"
                  className={`p-2 rounded-lg transition-all ${tool === 'pan' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
                >
                  <Move className="w-4 h-4" />
                </button>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-2">
                  <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1 text-neutral-400 hover:text-white" aria-label="Zoom Out" title="Zoom Out">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-neutral-300 w-8 text-center font-mono">{Math.round(scale * 100)}%</span>
                  <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1 text-neutral-400 hover:text-white" aria-label="Zoom In" title="Zoom In">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setScale(1); setPan({x: 0, y: 0}); }} className="px-2 py-1 text-[10px] bg-neutral-800 rounded hover:bg-neutral-700 text-neutral-300 ml-1" aria-label="Reset Zoom and Pan" title="Reset Zoom and Pan">
                    Reset
                  </button>
                </div>

                {/* Color Picker */}
                <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => { setColor(c); setTool('pen'); }}
                      className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${color === c && tool === 'pen' ? 'border-white scale-125' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      aria-label={`Select ${COLOR_NAMES[c] || 'Color'} brush`}
                      title={`Select ${COLOR_NAMES[c] || 'Color'} brush`}
                    />
                  ))}
                </div>

                {/* Brush Size */}
                <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-2">
                  <button onClick={() => setBrushSize(s => Math.max(1, s - 1))} className="p-1 text-neutral-400 hover:text-white" aria-label="Decrease Brush Size" title="Decrease Brush Size">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-neutral-300 w-4 text-center font-mono">{brushSize}</span>
                  <button onClick={() => setBrushSize(s => Math.min(20, s + 1))} className="p-1 text-neutral-400 hover:text-white" aria-label="Increase Brush Size" title="Increase Brush Size">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800/60 rounded-lg border border-white/5">
                <Lock className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-xs text-neutral-500">View Only — Admin se permission maangein</span>
              </div>
            )}
          </div>

          {/* Center — Drawing indicator */}
          <div className="flex-1 flex justify-center">
            {drawingUser && (
              <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                <span className="text-[10px] text-orange-400 font-semibold">{drawingUser} likh raha hai...</span>
              </div>
            )}
          </div>

          {/* Right — Actions */}
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={clearAll}
                aria-label="Clear All"
                title="Clear All"
                className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={downloadCanvas}
              aria-label="Download PNG"
              title="Download PNG"
              className="p-2 text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
            >
              <Download className="w-4 h-4" />
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowStudents(!showStudents)}
                title="Student Permissions"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showStudents ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{students.length} Students</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all"
              aria-label="Close Whiteboard"
              title="Close Whiteboard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Base canvas (committed strokes) */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0"
            style={{ cursor: canWrite ? (tool === 'pan' ? 'grab' : tool === 'eraser' ? 'cell' : 'crosshair') : 'not-allowed' }}
          />
          {/* Overlay canvas (live drawing preview) */}
          <canvas
            ref={overlayRef}
            className="absolute inset-0"
            style={{ cursor: canWrite ? (tool === 'pan' ? (isPanning ? 'grabbing' : 'grab') : tool === 'eraser' ? 'cell' : 'crosshair') : 'not-allowed' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />

          {/* Locked overlay for students without permission */}
          {!canWrite && (
            <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
              <div className="bg-neutral-900/80 backdrop-blur-sm border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-3">
                <Lock className="w-4 h-4 text-neutral-500" />
                <span className="text-sm text-neutral-400">Sirf dekhne ka mode — Admin permission dega tab likh sakte hain</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Student Permission Panel (Admin only) ── */}
      {isAdmin && showStudents && (
        <div className="w-64 bg-neutral-900 border-l border-white/5 flex flex-col shrink-0">
          <div className="p-4 border-b border-white/5">
            <h3 className="text-sm font-bold text-white">Student Permissions</h3>
            <p className="text-[10px] text-neutral-500 mt-1">Toggle karo kaun whiteboard par likh sakta hai</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {students.length === 0 ? (
              <div className="text-center py-8 text-neutral-600 text-xs">
                Abhi koi student join nahi hua
              </div>
            ) : (
              students.map(student => (
                <div key={student.userId} className="flex items-center justify-between p-3 bg-neutral-800/50 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${student.isOnline ? 'bg-emerald-500' : 'bg-neutral-600'}`} />
                    <span className="text-sm text-white truncate">{student.userName}</span>
                  </div>
                  <button
                    onClick={() => toggleStudentPermission(student)}
                    aria-label={student.canWrite ? 'Remove write access' : 'Give write access'}
                    title={student.canWrite ? 'Remove write access' : 'Give write access'}
                    className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all ${
                      student.canWrite
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30'
                        : 'bg-neutral-700 text-neutral-400 border border-neutral-600 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30'
                    }`}
                  >
                    {student.canWrite ? (
                      <><Unlock className="w-3 h-3" /> Write</>
                    ) : (
                      <><Lock className="w-3 h-3" /> View</>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Grant all / Revoke all */}
          {students.length > 0 && (
            <div className="p-3 border-t border-white/5 flex gap-2">
              <button
                onClick={() => students.forEach(s => !s.canWrite && toggleStudentPermission(s))}
                className="flex-1 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold hover:bg-emerald-600/30 transition-all"
              >
                Sabko Write
              </button>
              <button
                onClick={() => students.forEach(s => s.canWrite && toggleStudentPermission(s))}
                className="flex-1 py-2 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg text-[10px] font-bold hover:bg-red-600/30 transition-all"
              >
                Sabko View
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
