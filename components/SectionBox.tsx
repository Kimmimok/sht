'use client';

import React from 'react';

export default function SectionBox({
  title,
  icon,
  children,
}: {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 bg-gray-50 border rounded mb-4">
      {(title || icon) && (
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          {icon}
          {title}
        </h3>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
