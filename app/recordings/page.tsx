"use client";

import { useEffect, useState } from "react";

interface Recording {
  id: string;
  meeting_id: string;
  download_url: string;
  download_audio_url: string;
  status: string;
}

export default function RecordingsPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);

  useEffect(() => {
    fetch("/api/live/recordings")
      .then((r) => r.json())
      .then((data: any) => setRecordings(data.result || []));
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", padding: 20 }}>
      <h1>📼 Class Recordings</h1>
      {recordings.length === 0 && <p>Koi recording nahi mili.</p>}
      {recordings.map((rec) => (
        <div key={rec.id} style={{ border: "1px solid #ddd", padding: 16, marginBottom: 10, borderRadius: 8 }}>
          <p><strong>Meeting:</strong> {rec.meeting_id}</p>
          <p><strong>Status:</strong> {rec.status}</p>
          {rec.download_url && (
            <a href={rec.download_url} target="_blank" style={{ color: "#f6821f" }}>
              🎬 Video Download
            </a>
          )}
          {rec.download_audio_url && (
            <a href={rec.download_audio_url} target="_blank" style={{ marginLeft: 16, color: "#f6821f" }}>
              🎵 Audio Download
            </a>
          )}
        </div>
      ))}
    </div>
  );
}