"use client";

import React, { useEffect, useState } from 'react';

export default function Wrapper({ params }: { params: Promise<{ roomId: string }> }) {
  const [Component, setComponent] = useState<any>(null);

  useEffect(() => {
    import('./ParticipantClient').then((mod) => setComponent(() => mod.default));
  }, []);

  if (!Component) return null;
  return <Component params={params} />;
}
