'use client';

import React from 'react';

export default function SectionBox({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-gray-50 border rounded mb-4">
      {title && <h3 className="font-semibold mb-3">{title}</h3>}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
