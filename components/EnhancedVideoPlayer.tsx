'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Settings, RotateCcw, FastForward, Sliders, AlertCircle } from 'lucide-react';

interface EnhancedVideoPlayerProps {
  src: string;
  onProgress?: (percentage: number) => void;
}

export default function EnhancedVideoPlayer({ src, onProgress }: EnhancedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Auto play when loaded
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => setIsPlaying(true)).catch(e => {
        console.log("Autoplay prevented:", e);
        setIsPlaying(false);
        if (e.name === 'NotSupportedError') {
          setError("वीडियो स्रोत समर्थित नहीं है या अमान्य है। (Video source is not supported or invalid.)");
        }
      });
    }

    const handleTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(video.currentTime);
        if (video.duration > 0 && onProgress) {
          const pct = (video.currentTime / video.duration) * 100;
          onProgress(pct);
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    const handleError = (e: Event) => {
      console.error("Video element error:", e);
      setError("वीडियो लोड करने में त्रुटि। कृपया बाद में पुनः प्रयास करें। (Error loading video. Please try again later.)");
      setIsPlaying(false);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSeeking]);

  const togglePlay = () => {
    if (error) return; // Don't try to play if there's an error
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsPlaying(true);
            setError(null);
          }).catch(error => {
            console.error("Playback prevented:", error);
            setIsPlaying(false);
            if (error.name === 'NotSupportedError') {
               setError("वीडियो स्रोत समर्थित नहीं है या अमान्य है। (Video source is not supported or invalid.)");
            }
          });
        }
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (!isSeeking && videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      videoRef.current.muted = newMuted;
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current as any;
    const doc = document as any;

    if (!container) return;

    if (
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    ) {
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    } else {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      } else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
        // Specific for iOS Safari on iPhone
        (videoRef.current as any).webkitEnterFullscreen();
      } else {
        alert("आपका ब्राउज़र फुलस्क्रीन मोड का समर्थन नहीं करता है। (Your browser does not support fullscreen mode.)");
      }
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group shadow-2xl border border-neutral-800"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video 
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain cursor-pointer"
        onClick={togglePlay}
        playsInline
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Overlay controls */}
      <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 flex flex-col justify-end p-4 md:p-6 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Progress Bar */}
        <div className="relative w-full mb-4 group/progress">
          <input 
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            onMouseDown={() => setIsSeeking(true)}
            onMouseUp={() => {
              setIsSeeking(false);
              if (videoRef.current) videoRef.current.currentTime = currentTime;
            }}
            className="w-full h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:h-2 transition-all outline-none"
          />
          <div 
            className="absolute top-0 left-0 h-1.5 bg-orange-500 rounded-lg pointer-events-none"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={togglePlay} className="text-white hover:text-orange-400 transition-colors" aria-label={isPlaying ? "Pause" : "Play"} title={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
            </button>

            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="text-white hover:text-orange-400 transition-colors" aria-label={isMuted || volume === 0 ? "Unmute" : "Mute"} title={isMuted || volume === 0 ? "Unmute" : "Mute"}>
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-20 transition-all duration-300 appearance-none bg-neutral-700 h-1 rounded-lg accent-white cursor-pointer"
              />
            </div>

            <div className="text-white text-sm font-mono tracking-wider">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Speed Control */}
            <div className="relative group/speed">
              <button className="flex items-center gap-1 text-white text-xs font-bold bg-neutral-800/50 px-2 py-1 rounded-lg hover:bg-neutral-700 transition-colors">
                <Sliders className="w-3 h-3" />
                {playbackRate}x
              </button>
              <div className="absolute bottom-full right-0 mb-2 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl opacity-0 invisible group-hover/speed:opacity-100 group-hover/speed:visible transition-all p-1 flex flex-col gap-1">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                  <button 
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    className={`px-3 py-1.5 text-xs rounded-md transition-colors ${playbackRate === rate ? 'bg-orange-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {/* Quality (Mock) */}
            <div className="relative group/quality">
              <button className="flex items-center gap-1 text-white text-xs font-bold bg-neutral-800/50 px-2 py-1 rounded-lg hover:bg-neutral-700 transition-colors">
                <Settings className="w-3 h-3" />
                Auto
              </button>
              <div className="absolute bottom-full right-0 mb-2 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl opacity-0 invisible group-hover/quality:opacity-100 group-hover/quality:visible transition-all p-1 flex flex-col gap-1 w-24">
                {['1080p', '720p', '480p', 'Auto'].map(q => (
                  <button 
                    key={q}
                    className={`px-3 py-1.5 text-xs text-left rounded-md transition-colors ${q === 'Auto' ? 'bg-neutral-800 text-orange-400' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={toggleFullscreen} className="text-white hover:text-orange-400 transition-colors" aria-label="Toggle Fullscreen" title="Toggle Fullscreen">
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Center large play button when paused */}
      {!isPlaying && !error && (
        <div 
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center cursor-pointer group-hover:bg-black/20 transition-all"
        >
          <div className="w-20 h-20 bg-orange-600/90 text-white rounded-full flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110">
            <Play className="w-10 h-10 fill-current ml-1" />
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center p-6 z-20 backdrop-blur-sm">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4 animate-pulse" />
          <p className="text-white font-bold max-w-md">{error}</p>
        </div>
      )}
    </div>
  );
}
